import * as THREE from 'three';
import { laneX } from '../core/config';
import { groundHeight } from './journey';
import type { CoinData } from './TrackGenerator';

const MAX = 400;

/** Draws all coins in a single draw call (instancing) and makes them spin. */
export class CoinRenderer {
  private mesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private time = 0;

  constructor(scene: THREE.Scene) {
    const geo = new THREE.CylinderGeometry(0.38, 0.38, 0.08, 14);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: '#ffcc33', metalness: 0.8, roughness: 0.25, emissive: '#b07000', emissiveIntensity: 0.6 });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
  }

  sync(coins: readonly CoinData[], distance: number, dt: number): void {
    this.time += dt;
    let n = 0;
    const g0 = groundHeight(distance);
    for (const c of coins) {
      if (c.taken || n >= MAX) continue;
      this.dummy.position.set(laneX(c.lane), groundHeight(c.z) - g0 + c.y + Math.sin(this.time * 4 + c.z) * 0.08, -(c.z - distance));
      this.dummy.rotation.set(0, this.time * 3 + c.z * 0.3, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(n++, this.dummy.matrix);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
