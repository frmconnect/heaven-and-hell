import * as THREE from 'three';
import { laneX } from '../core/config';
import type { PlayerMotion } from './PlayerMotion';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HumanFigure, type Palette, type TexturedCharacter } from './CharacterModel';

/** A simple low-poly runner: a lost soul in a pale tunic. Animates running, jumping, sliding and stumbling. */
export class PlayerAvatar {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  /** The simple built-in runner (used until / unless the animated model loads). */
  private simple = new THREE.Group();
  /** The animated runner (Quaternius Animated Man). */
  private figure: HumanFigure | null = null;
  private palette: Palette = { skin: '#e8b796', eyes: '#292929', hair: '#3a2216', shirt: '#efe6d2', pants: '#4a3226' };
  private golden = false;
  private wasGrounded = true;
  private wasSliding = false;
  /** Realistic Mixamo runner (Decisions log #43): has its own slide, stumble and flying animations. */
  private realistic = false;
  private stumbleTime = 0;
  private armL: THREE.Group;
  private armR: THREE.Group;
  private legL: THREE.Group;
  private legR: THREE.Group;
  private clothMat: THREE.MeshStandardMaterial;
  private phase = 0;
  private flash = 0;
  private fallY = 0;
  private baseEmissive = new THREE.Color('#000000');
  private flashColor = new THREE.Color('#ff2200');
  /** Flight Burst height (set by the game each frame). */
  fly = 0;
  private halo: THREE.Group;
  private darkMat!: THREE.MeshStandardMaterial;
  private hairMat!: THREE.MeshStandardMaterial;
  private wingPivotL = new THREE.Group();
  private wingPivotR = new THREE.Group();
  private wingMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, side: THREE.DoubleSide, flatShading: true, transparent: true, opacity: 1 });
  private wingKind = 'none';
  private wingTime = 0;
  private bubbleMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    const skin = new THREE.MeshStandardMaterial({ color: '#e8b796', roughness: 0.8, flatShading: true });
    this.clothMat = new THREE.MeshStandardMaterial({ color: '#efe6d2', roughness: 0.9, flatShading: true, emissive: '#ff2200', emissiveIntensity: 0 });
    const dark = new THREE.MeshStandardMaterial({ color: '#4a3226', roughness: 0.9, flatShading: true });
    const hair = new THREE.MeshStandardMaterial({ color: '#3a2216', roughness: 1, flatShading: true });
    this.darkMat = dark;
    this.hairMat = hair;

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.32), this.clothMat);
    torso.position.y = 1.15;
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.08, 0.34), dark);
    belt.position.y = 0.84;
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), skin);
    head.position.y = 1.72;
    const hairM = new THREE.Mesh(new THREE.IcosahedronGeometry(0.21, 1), hair);
    hairM.position.set(0, 1.78, 0.04);
    hairM.scale.set(1, 0.7, 1);
    this.simple.add(torso, belt, head, hairM);
    this.body.add(this.simple);

    const limb = (w: number, h: number, mat: THREE.Material, x: number, y: number) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
      m.position.y = -h / 2;
      pivot.add(m);
      this.simple.add(pivot);
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

    // wings (shop cosmetic): hinged at the shoulders, behind the back
    this.wingPivotL.position.set(-0.12, 1.4, 0.18);
    this.wingPivotR.position.set(0.12, 1.4, 0.18);
    this.body.add(this.wingPivotL, this.wingPivotR);

    // the player faces away from the camera (towards -z)
    this.root.add(this.body);
    scene.add(this.root);
  }

  /** Swap the simple shapes for the animated character (called once the model has loaded). */
  useFigure(gltf: GLTF): void {
    if (this.realistic) return; // a realistic runner is already in
    this.setFigure(new HumanFigure(gltf, 1.8, this.palette), false);
    this.applyFigureLook();
  }

  /** Use a realistic runner (Maria or Ely). Replaces whatever runner is shown. */
  useRealistic(c: TexturedCharacter): void {
    this.setFigure(new HumanFigure(c.gltf, 1.8, c.materials), true);
  }

  /** Soft light that follows the runner, so dark armour still stands out in dark worlds. */
  private fill: THREE.PointLight | null = null;

  private setFigure(f: HumanFigure, realistic: boolean): void {
    if (this.figure) this.body.remove(this.figure.root);
    if (realistic && !this.fill) {
      this.fill = new THREE.PointLight('#fff1dc', 7, 7, 1.6);
      this.fill.position.set(0.6, 2.2, 2.4); // above and behind, towards the camera
      this.root.add(this.fill);
    }
    this.figure = f;
    this.realistic = realistic;
    this.simple.visible = false;
    this.body.add(f.root);
    f.play('run', 0);
  }

  get hasFigure(): boolean {
    return !!this.figure;
  }

  private applyFigureLook(): void {
    if (!this.figure || this.realistic) return;
    this.figure.setPalette(this.palette);
    const m = this.figure.material;
    m.metalness = this.golden ? 0.6 : 0;
    m.roughness = this.golden ? 0.35 : 0.85;
  }

  reset(): void {
    this.fallY = 0;
    this.flash = 0;
    this.body.rotation.set(0, 0, 0);
    this.body.position.set(0, 0, 0);
  }

  /** Outfit colours (shop cosmetic, Decisions log #24). */
  setOutfit(look: { primary: string; secondary?: string; extra?: string; glow?: string }): void {
    this.clothMat.color.set(look.primary);
    this.clothMat.metalness = look.primary === '#ffcc40' ? 0.7 : 0;
    this.clothMat.roughness = look.primary === '#ffcc40' ? 0.3 : 0.9;
    this.darkMat.color.set(look.secondary ?? '#4a3226');
    this.darkMat.emissive.set(look.glow ?? '#000000');
    this.hairMat.color.set(look.extra ?? '#3a2216');
    this.baseEmissive.set(look.glow ?? '#000000');
    // animated runner: shirt = main colour, trousers = second colour, hair = third
    this.palette = { skin: '#e8b796', eyes: '#292929', hair: look.extra ?? '#3a2216', shirt: look.primary, pants: look.secondary ?? '#4a3226' };
    this.golden = look.primary === '#ffcc40';
    this.applyFigureLook();
  }

  /** Wings (shop cosmetic): angel / bat / crystal / fire, or none. */
  setWings(kind: string, look: { primary: string; glow?: string }): void {
    if (kind === this.wingKind) return;
    this.wingKind = kind;
    for (const p of [this.wingPivotL, this.wingPivotR]) p.clear();
    if (kind === 'none') return;
    this.wingMat.color.set(look.primary);
    this.wingMat.emissive.set(look.glow ?? '#000000');
    this.wingMat.emissiveIntensity = ['firewings', 'crystalwings', 'seraphwings', 'eternitywings'].includes(kind) ? 1.2 : 0.4;
    this.wingMat.opacity = kind === 'crystalwings' ? 0.8 : 1;
    const shape = new THREE.Shape();
    if (kind === 'batwings') {
      shape.moveTo(0, 0); shape.lineTo(1.3, 0.55); shape.lineTo(1.1, 0.05); shape.lineTo(1.25, -0.35);
      shape.lineTo(0.8, -0.15); shape.lineTo(0.7, -0.55); shape.lineTo(0.3, -0.25);
    } else if (kind === 'crystalwings') {
      shape.moveTo(0, 0); shape.lineTo(0.5, 0.75); shape.lineTo(1.25, 0.5); shape.lineTo(0.9, 0); shape.lineTo(1.1, -0.6); shape.lineTo(0.35, -0.3);
    } else {
      // feathered (angel) and flame (fire) wings share a curved outline
      shape.moveTo(0, 0); shape.quadraticCurveTo(0.5, 0.9, 1.35, 0.7); shape.lineTo(1.15, 0.35); shape.lineTo(1.25, 0.1);
      shape.lineTo(0.95, -0.05); shape.lineTo(1.0, -0.35); shape.lineTo(0.6, -0.3); shape.lineTo(0.5, -0.6); shape.quadraticCurveTo(0.15, -0.3, 0, 0);
    }
    const geo = new THREE.ShapeGeometry(shape);
    const r = new THREE.Mesh(geo, this.wingMat);
    const l = new THREE.Mesh(geo, this.wingMat);
    l.scale.x = -1;
    this.wingPivotR.add(r);
    this.wingPivotL.add(l);
  }

  stumble(): void {
    this.flash = 0.5;
    if (this.realistic && this.figure) {
      this.figure.play('stumble', 0.08, true, 0.25);
      this.figure.setSpeed(1.4);
      this.stumbleTime = 0.45;
    }
  }

  /** shield = halo on; safe = shield just broke (flicker). */
  setShield(shield: boolean, safe: boolean, time: number): void {
    this.halo.visible = shield || (safe && Math.floor(time * 12) % 2 === 0);
    this.bubbleMat.opacity = shield ? 0.16 + Math.sin(time * 4) * 0.05 : 0.3;
  }

  update(dt: number, m: PlayerMotion, speed: number, ended: string | null): void {
    // wings flap: faster when running, wide open when flying
    this.wingTime += dt * (speed > 0 ? 9 : 3);
    const open = this.fly > 0.3 ? 0.15 : 0.55 + Math.sin(this.wingTime) * 0.35;
    this.wingPivotR.rotation.y = -open;
    this.wingPivotL.rotation.y = open;
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
      this.figure?.setSpeed(0);
      this.figure?.update(dt);
      return;
    }

    this.phase += dt * speed * 0.9;
    const s = Math.sin(this.phase);
    if (this.figure) {
      this.updateFigure(dt, m, speed);
      return;
    }
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
    const flashing = this.flash > 0 && Math.floor(this.flash * 20) % 2 === 0;
    this.clothMat.emissive.copy(flashing ? this.flashColor : this.baseEmissive);
    this.clothMat.emissiveIntensity = flashing ? 0.9 : 0.5;
  }

  /** The animated runner: run / jump clips, plus leaning for slides and flight. */
  private updateFigure(dt: number, m: PlayerMotion, speed: number): void {
    const f = this.figure!;
    const k = Math.min(1, dt * 15);
    if (this.realistic) {
      this.updateRealistic(dt, m, speed, f);
      return;
    }
    if (this.fly > 0.3) {
      // flying: soaring forward, legs trailing
      this.body.rotation.x = THREE.MathUtils.lerp(this.body.rotation.x, 0.9, Math.min(1, dt * 8));
      if (f.playing !== 'jump') f.play('jump', 0.15, true, 0.45);
      f.setSpeed(0);
      this.halo.visible = true;
    } else if (m.sliding) {
      // slide: lean far back, legs still running slowly
      this.body.rotation.x = THREE.MathUtils.lerp(this.body.rotation.x, -1.2, Math.min(1, dt * 20));
      this.body.position.y = THREE.MathUtils.lerp(this.body.position.y, 0.3, Math.min(1, dt * 20));
      f.play('run', 0.1);
      f.setSpeed(0.4);
    } else {
      this.body.rotation.x = THREE.MathUtils.lerp(this.body.rotation.x, 0, k);
      this.body.position.y = THREE.MathUtils.lerp(this.body.position.y, 0, k);
      if (!m.grounded) {
        // take off: start the jump clip after its crouch, hold the tuck in the air
        if (this.wasGrounded || f.playing !== 'jump') f.play('jump', 0.08, true, 0.3);
        f.setSpeed(1.6);
      } else {
        f.play('run', 0.1);
        // one stride of the clip (0.63 s) matches the old stride length
        f.setSpeed(Math.max(0.6, speed * 0.09));
      }
    }
    this.wasGrounded = m.grounded;
    f.update(dt);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
    const flashing = this.flash > 0 && Math.floor(this.flash * 20) % 2 === 0;
    f.material.emissive.copy(flashing ? this.flashColor : this.baseEmissive);
    f.material.emissiveIntensity = flashing ? 0.9 : 0.5;
  }

  /** Realistic runner: every move has its own animation (timed to the game's jump and slide). */
  private updateRealistic(dt: number, m: PlayerMotion, speed: number, f: HumanFigure): void {
    this.body.rotation.x = THREE.MathUtils.lerp(this.body.rotation.x, this.fly > 0.3 ? 0.2 : 0, Math.min(1, dt * 10));
    this.body.position.y = 0;
    this.stumbleTime = Math.max(0, this.stumbleTime - dt);
    if (this.fly > 0.3) {
      f.play('fly', 0.2);
      f.setSpeed(1);
      this.halo.visible = true;
    } else if (m.sliding) {
      // the slide clip drops low by 0.3 s and stays down until ~0.9 s; the game's slide lasts 0.75 s
      if (!this.wasSliding) f.play('slide', 0.08, true, 0.15);
      f.setSpeed(1.4);
    } else if (!m.grounded) {
      // the jump clip is airborne from 0.6 s to 1.3 s; the game's jump lasts 0.68 s
      if (this.wasGrounded || this.wasSliding) f.play('jump', 0.06, true, 0.6);
      f.setSpeed(1);
    } else if (this.stumbleTime > 0) {
      // keep the stumble playing
    } else {
      f.play('run', 0.15);
      f.setSpeed(Math.max(0.6, speed * 0.085));
    }
    this.wasGrounded = m.grounded;
    this.wasSliding = m.sliding;
    f.update(dt);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
    const flashing = this.flash > 0 && Math.floor(this.flash * 20) % 2 === 0;
    if (!f.material.emissiveMap) {
      f.material.emissive.set(flashing ? this.flashColor : '#000000');
      f.material.emissiveIntensity = flashing ? 0.6 : 0;
    } else {
      f.material.emissiveIntensity = flashing ? 4 : 1.5;
    }
  }
}
