import * as THREE from 'three';
import { MATERIALS } from './decor';

/** Pieces of floor breaking away and falling (when the Shadow drags you down). */
export class Crumble {
  private pieces: { m: THREE.Mesh; v: THREE.Vector3; spin: THREE.Vector3 }[] = [];
  private group = new THREE.Group();

  constructor(scene: THREE.Scene) {
    const geo = new THREE.BoxGeometry(1, 0.4, 1);
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(geo, MATERIALS.marblePlain);
      m.visible = false;
      this.group.add(m);
      this.pieces.push({ m, v: new THREE.Vector3(), spin: new THREE.Vector3() });
    }
    scene.add(this.group);
  }

  /** Break the floor around the player at x. */
  start(x: number, material: THREE.Material): void {
    this.pieces.forEach((p, i) => {
      p.m.material = material;
      p.m.visible = true;
      const s = 0.5 + Math.random() * 0.8;
      p.m.scale.set(s, 0.4 + Math.random() * 0.4, s);
      p.m.position.set(x + (Math.random() - 0.5) * 3.2, -0.2, (Math.random() - 0.5) * 3.5 - (i % 3) * 0.6);
      p.v.set((Math.random() - 0.5) * 2, Math.random() * 1.5, (Math.random() - 0.5) * 2);
      p.spin.set(Math.random() * 4, Math.random() * 4, Math.random() * 4);
    });
  }

  stop(): void {
    for (const p of this.pieces) p.m.visible = false;
  }

  update(dt: number): void {
    for (const p of this.pieces) {
      if (!p.m.visible) continue;
      p.v.y -= 14 * dt;
      p.m.position.addScaledVector(p.v, dt);
      p.m.rotation.x += p.spin.x * dt;
      p.m.rotation.y += p.spin.y * dt;
      p.m.rotation.z += p.spin.z * dt;
      if (p.m.position.y < -40) p.m.visible = false;
    }
  }
}
