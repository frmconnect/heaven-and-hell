import * as THREE from 'three';
import { laneX } from '../core/config';
import type { PlayerMotion } from './PlayerMotion';

/** A simple low-poly runner: a lost soul in a pale tunic. Animates running, jumping, sliding and stumbling. */
export class PlayerAvatar {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private armL: THREE.Group;
  private armR: THREE.Group;
  private legL: THREE.Group;
  private legR: THREE.Group;
  private clothMat: THREE.MeshStandardMaterial;
  private phase = 0;
  private flash = 0;
  private fallY = 0;
  /** Flight Burst height (set by the game each frame). */
  fly = 0;
  private halo: THREE.Group;
  private bubbleMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    const skin = new THREE.MeshStandardMaterial({ color: '#e8b796', roughness: 0.8, flatShading: true });
    this.clothMat = new THREE.MeshStandardMaterial({ color: '#efe6d2', roughness: 0.9, flatShading: true, emissive: '#ff2200', emissiveIntensity: 0 });
    const dark = new THREE.MeshStandardMaterial({ color: '#4a3226', roughness: 0.9, flatShading: true });
    const hair = new THREE.MeshStandardMaterial({ color: '#3a2216', roughness: 1, flatShading: true });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.32), this.clothMat);
    torso.position.y = 1.15;
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.08, 0.34), dark);
    belt.position.y = 0.84;
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), skin);
    head.position.y = 1.72;
    const hairM = new THREE.Mesh(new THREE.IcosahedronGeometry(0.21, 1), hair);
    hairM.position.set(0, 1.78, 0.04);
    hairM.scale.set(1, 0.7, 1);
    this.body.add(torso, belt, head, hairM);

    const limb = (w: number, h: number, mat: THREE.Material, x: number, y: number) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
      m.position.y = -h / 2;
      pivot.add(m);
      this.body.add(pivot);
      return pivot;
    };
    this.armL = limb(0.14, 0.62, skin, -0.36, 1.45);
    this.armR = limb(0.14, 0.62, skin, 0.36, 1.45);
    this.legL = limb(0.18, 0.82, dark, -0.14, 0.82);
    this.legR = limb(0.18, 0.82, dark, 0.14, 0.82);

    // Miracle Shield: golden halo + soft light bubble (Decisions log #18)
    this.halo = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.05, 8, 20),
      new THREE.MeshStandardMaterial({ color: '#ffe27a', metalness: 0.9, roughness: 0.2, emissive: '#ffb000', emissiveIntensity: 1.2 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 2.1;
    this.bubbleMat = new THREE.MeshBasicMaterial({ color: '#fff2b0', transparent: true, opacity: 0.18, depthWrite: false });
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12), this.bubbleMat);
    bubble.position.y = 1.0;
    this.halo.add(ring, bubble);
    this.halo.visible = false;
    this.body.add(this.halo);

    // the player faces away from the camera (towards -z)
    this.root.add(this.body);
    scene.add(this.root);
  }

  reset(): void {
    this.fallY = 0;
    this.flash = 0;
    this.body.rotation.set(0, 0, 0);
    this.body.position.set(0, 0, 0);
  }

  stumble(): void {
    this.flash = 0.5;
  }

  /** shield = halo on; safe = shield just broke (flicker). */
  setShield(shield: boolean, safe: boolean, time: number): void {
    this.halo.visible = shield || (safe && Math.floor(time * 12) % 2 === 0);
    this.bubbleMat.opacity = shield ? 0.16 + Math.sin(time * 4) * 0.05 : 0.3;
  }

  update(dt: number, m: PlayerMotion, speed: number, ended: string | null): void {
    this.root.position.set(m.x, m.y + this.fly, 0);
    // lean into lane changes
    this.root.rotation.z = THREE.MathUtils.clamp(-(laneX(m.lane) - m.x) * 0.25, -0.35, 0.35);

    if (ended === 'fall') {
      this.fallY -= dt * 3;
      this.body.position.y = this.fallY;
      this.body.rotation.x = Math.min(this.body.rotation.x + dt * 2, 0.8);
      return;
    }
    if (ended) {
      this.body.rotation.x = Math.max(this.body.rotation.x - dt * 6, -0.5);
      return;
    }

    this.phase += dt * speed * 0.9;
    const s = Math.sin(this.phase);
    if (this.fly > 0.3) {
      // flying: arms spread wide, leaning forward like soaring
      this.body.rotation.x = THREE.MathUtils.lerp(this.body.rotation.x, 0.7, Math.min(1, dt * 8));
      this.armL.rotation.set(0, 0, -1.4);
      this.armR.rotation.set(0, 0, 1.4);
      this.legL.rotation.x = 0.3;
      this.legR.rotation.x = 0.1;
      this.halo.visible = true;
      return;
    }
    this.armL.rotation.z = 0;
    this.armR.rotation.z = 0;
    if (m.sliding) {
      this.body.rotation.x = THREE.MathUtils.lerp(this.body.rotation.x, -1.25, Math.min(1, dt * 20));
      this.body.position.y = THREE.MathUtils.lerp(this.body.position.y, 0.35, Math.min(1, dt * 20));
      this.armL.rotation.x = this.armR.rotation.x = 2.6;
      this.legL.rotation.x = this.legR.rotation.x = 0.3;
    } else {
      this.body.rotation.x = THREE.MathUtils.lerp(this.body.rotation.x, 0.12, Math.min(1, dt * 15));
      this.body.position.y = THREE.MathUtils.lerp(this.body.position.y, 0, Math.min(1, dt * 15));
      if (!m.grounded) {
        this.legL.rotation.x = -1.1;
        this.legR.rotation.x = 0.5;
        this.armL.rotation.x = 2.4;
        this.armR.rotation.x = 2.4;
      } else {
        this.legL.rotation.x = s * 0.9;
        this.legR.rotation.x = -s * 0.9;
        this.armL.rotation.x = -s * 0.8;
        this.armR.rotation.x = s * 0.8;
        this.body.position.y = Math.abs(Math.cos(this.phase)) * 0.08;
      }
    }

    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
    this.clothMat.emissiveIntensity = this.flash > 0 && Math.floor(this.flash * 20) % 2 === 0 ? 0.9 : 0;
  }
}
