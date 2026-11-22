import * as THREE from 'three';
import { MATERIALS as M } from './decor';
import { GATE_Z } from './gateZ';
export { GATE_Z };

/**
 * Heaven's Gate: two giant marble pillars, a golden arch and pearly gates that swing open
 * as you approach, with blinding light pouring through.
 */
export class GateSet {
  readonly root = new THREE.Group();
  private doorL = new THREE.Group();
  private doorR = new THREE.Group();
  private light: THREE.PointLight;
  private glow: THREE.Mesh;
  private rays: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    const box = new THREE.BoxGeometry(1, 1, 1);
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 12);
    const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, s: [number, number, number], p: [number, number, number]) => {
      const m = new THREE.Mesh(geo, mat);
      m.scale.set(...s);
      m.position.set(...p);
      parent.add(m);
      return m;
    };
    const pearl = new THREE.MeshStandardMaterial({ color: '#fbf6ee', roughness: 0.15, metalness: 0.3, emissive: '#fff2dc', emissiveIntensity: 0.35 });

    for (const s of [-1, 1]) {
      add(this.root, box, M.marblePlain, [3, 1.5, 3], [s * 6.2, 0.75, 0]);
      add(this.root, cyl, M.marblePlain, [1.1, 18, 1.1], [s * 6.2, 10.5, 0]);
      add(this.root, box, M.gold, [2.8, 1.2, 2.8], [s * 6.2, 20, 0]);
      add(this.root, cyl, M.gold, [1.25, 0.5, 1.25], [s * 6.2, 2, 0]);
    }
    // golden arch
    const arch = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.7, 8, 24, Math.PI), M.gold);
    arch.position.set(0, 20.5, 0);
    this.root.add(arch);
    add(this.root, box, M.gold, [15.5, 1, 1.6], [0, 20.6, 0]);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(1.4, 0), M.glowWhite);
    star.position.set(0, 27.6, 0);
    this.root.add(star);

    // the doors (hinged at the pillars)
    for (const [door, s] of [[this.doorL, -1], [this.doorR, 1]] as const) {
      door.position.set(s * 5.2, 0, 0);
      const w = 5.2;
      const panel = add(door, box, pearl, [w, 17, 0.35], [-s * w / 2, 8.6, 0]);
      void panel;
      for (let i = 0; i < 6; i++) add(door, box, M.gold, [0.14, 16.4, 0.5], [-s * (0.45 + i * 0.85), 8.6, 0]);
      for (const y of [2, 8.6, 15]) add(door, box, M.gold, [w, 0.25, 0.5], [-s * w / 2, y, 0]);
      const knob = add(door, cyl, M.gold, [0.4, 0.3, 0.4], [-s * (w - 0.5), 8.6, 0.3]);
      knob.rotation.x = Math.PI / 2;
      this.root.add(door);
    }

    // light beyond the gates
    this.glow = new THREE.Mesh(new THREE.PlaneGeometry(14, 22), new THREE.MeshBasicMaterial({ color: '#fff4d0', fog: false, transparent: true, opacity: 0 }));
    this.glow.position.set(0, 10, -1.5);
    this.root.add(this.glow);
    const rayMat = new THREE.MeshBasicMaterial({ color: '#fff6d8', fog: false, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    this.rays = new THREE.Mesh(new THREE.ConeGeometry(14, 40, 16, 1, true), rayMat);
    this.rays.rotation.x = -Math.PI / 2;
    this.rays.position.set(0, 10, 18);
    this.root.add(this.rays);
    this.light = new THREE.PointLight('#fff4d6', 0, 70, 1.2);
    this.light.position.set(0, 8, -4);
    this.root.add(this.light);

    this.root.visible = false;
    scene.add(this.root);
  }

  /** dz = how far ahead the gate is (metres); y = its height relative to the player's ground. */
  update(dz: number, y: number, time: number): void {
    const visible = dz < 330 && dz > -40;
    this.root.visible = visible;
    if (!visible) return;
    this.root.position.set(0, y, -dz);
    // doors open between 70 m and 25 m away
    const open = THREE.MathUtils.smoothstep(70 - dz, 0, 45);
    this.doorL.rotation.y = open * 1.45;
    this.doorR.rotation.y = -open * 1.45;
    const glow = 0.2 + open * 0.5;
    (this.glow.material as THREE.MeshBasicMaterial).opacity = glow;
    (this.rays.material as THREE.MeshBasicMaterial).opacity = open * (0.07 + Math.sin(time * 2) * 0.02);
    this.light.intensity = open * 35;
  }
}
