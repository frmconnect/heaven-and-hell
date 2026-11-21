import * as THREE from 'three';

/**
 * The Shadow of your sins (Decisions log #14): a dark hooded spirit with glowing violet eyes
 * and trailing wisps. It floats after you through Heaven, placed on screen like the Devil.
 */
export class ShadowAvatar {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private robeMat: THREE.MeshStandardMaterial;
  private wispMat: THREE.MeshBasicMaterial;
  private eyeMat: THREE.MeshBasicMaterial;
  private wisps: THREE.Mesh[] = [];
  private armL: THREE.Group;
  private armR: THREE.Group;
  private aura: THREE.PointLight;
  private time = 0;
  private x = 0;
  private sinkY = 0;
  private fade = 0;

  constructor(scene: THREE.Scene) {
    this.robeMat = new THREE.MeshStandardMaterial({ color: '#1a1024', roughness: 1, flatShading: true, emissive: '#2a0a40', emissiveIntensity: 0.5, transparent: true, opacity: 0 });
    this.wispMat = new THREE.MeshBasicMaterial({ color: '#3a1a5a', transparent: true, opacity: 0, depthWrite: false });
    this.eyeMat = new THREE.MeshBasicMaterial({ color: '#c88aff', transparent: true, opacity: 0 });

    const robe = new THREE.Mesh(new THREE.ConeGeometry(1.3, 3.4, 7, 1, true), this.robeMat);
    robe.position.y = 2.0;
    const chest = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 0), this.robeMat);
    chest.position.y = 3.2;
    chest.scale.set(1.1, 0.9, 0.8);
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.5, 6), this.robeMat);
    hood.position.set(0, 4.25, 0.05);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: '#05020a' }));
    face.position.set(0, 3.95, -0.28);
    face.scale.set(1, 1.1, 0.6);
    const eyeGeo = new THREE.SphereGeometry(0.09, 6, 4);
    const eyeL = new THREE.Mesh(eyeGeo, this.eyeMat);
    eyeL.position.set(-0.17, 4.0, -0.6);
    eyeL.scale.set(1.5, 0.7, 1);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.17;
    this.body.add(robe, chest, hood, face, eyeL, eyeR);

    const arm = (x: number) => {
      const g = new THREE.Group();
      g.position.set(x, 3.4, -0.1);
      const sleeve = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.8, 5), this.robeMat);
      sleeve.position.y = -0.9;
      sleeve.rotation.x = Math.PI;
      const hand = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.6, 4), this.eyeMat);
      hand.position.y = -1.9;
      hand.rotation.x = Math.PI;
      g.add(sleeve, hand);
      this.body.add(g);
      return g;
    };
    this.armL = arm(-1.0);
    this.armR = arm(1.0);

    // smoky wisps trailing below and behind
    const wispGeo = new THREE.ConeGeometry(0.35, 1.6, 5);
    for (let i = 0; i < 7; i++) {
      const w = new THREE.Mesh(wispGeo, this.wispMat);
      w.rotation.x = Math.PI;
      w.position.set(Math.cos(i * 0.9) * 0.9, 0.4, Math.sin(i * 0.9) * 0.6 + 0.3);
      this.wisps.push(w);
      this.body.add(w);
    }

    this.aura = new THREE.PointLight('#8a3aff', 0, 9, 1.5);
    this.aura.position.set(0, 3, -1);
    this.body.add(this.aura);
    this.root.add(this.body);
    this.root.scale.setScalar(0.85);
    this.root.visible = false;
    scene.add(this.root);
  }

  /** The Shadow grows with every temptation you take (Decisions log #14, #19). Looks only: the rules stay the same. */
  setSin(sin: number): void {
    this.root.scale.setScalar(0.85 * (1 + Math.min(sin, 10) * 0.045));
  }

  /** active = the Shadow is the current chaser. Same placement rules as the Devil. */
  update(dt: number, active: boolean, gap: number, playerX: number, caught: boolean, groundAt: (dz: number) => number): void {
    this.time += dt;
    // fades in when it rises (and out if not chasing)
    this.fade = THREE.MathUtils.clamp(this.fade + (active ? dt / 2.5 : -dt * 2), 0, 1);
    this.root.visible = this.fade > 0.01;
    if (!this.root.visible) return;
    const z = caught ? 1.4 : 2.7 + Math.min(gap, 8) * 0.3;
    const sink = caught ? -0.4 : Math.min(30, 0.8 + Math.max(0, gap - 2) * 0.45 + Math.max(0, gap - 7) * 1.5);
    this.root.position.z = THREE.MathUtils.lerp(this.root.position.z || z, z, Math.min(1, dt * (caught ? 10 : 4)));
    this.x = THREE.MathUtils.lerp(this.x, playerX * 0.8, Math.min(1, dt * 3));
    this.root.position.x = this.x;
    this.sinkY = THREE.MathUtils.lerp(this.sinkY, sink, Math.min(1, dt * 4));
    // floats and sways instead of running
    this.root.position.y = Math.sin(this.time * 2.2) * 0.25 - this.sinkY + groundAt(this.root.position.z);
    this.body.rotation.z = Math.sin(this.time * 1.7) * 0.06;
    const reach = caught ? -1.9 : -1.0;
    this.armL.rotation.x = reach + Math.sin(this.time * 3) * 0.25;
    this.armR.rotation.x = reach - Math.sin(this.time * 3) * 0.25;
    for (let i = 0; i < this.wisps.length; i++) {
      const w = this.wisps[i];
      const k = 1 + Math.sin(this.time * 4 + i * 1.3) * 0.3;
      w.scale.set(1, k, 1);
      w.position.y = 0.4 - k * 0.3;
    }
    const f = this.fade;
    this.robeMat.opacity = 0.92 * f;
    this.wispMat.opacity = 0.6 * f;
    this.eyeMat.opacity = f;
    this.eyeMat.color.setHSL(0.77, 1, 0.7 + Math.sin(this.time * 6) * 0.1);
    this.aura.intensity = (14 + Math.sin(this.time * 5) * 4) * f;
  }
}
