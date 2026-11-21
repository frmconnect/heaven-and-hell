import * as THREE from 'three';
import { laneX } from '../core/config';
import { groundHeight } from './journey';
import type { PickupData, PickupKind } from './TrackGenerator';

function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(c);
}

interface Active {
  kind: PickupKind;
  obj: THREE.Object3D;
  data: PickupData;
}

/**
 * Draws lost souls (ghostly figures reaching up), temptations (piles of cursed red gold)
 * and Miracle Shields (spinning golden halos). Pooled like the obstacles.
 * A saved soul floats up into the sky and fades away.
 */
export class PickupRenderer {
  private group = new THREE.Group();
  private pools: Record<PickupKind, THREE.Object3D[]> = { soul: [], temptation: [], miracle: [] };
  private active = new Map<number, Active>();
  private rising: { obj: THREE.Object3D; t: number; y: number; z: number; x: number }[] = [];
  private time = 0;
  private glow = glowTexture();
  private mats = {
    ghost: new THREE.MeshBasicMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.55, depthWrite: false }),
    ghostCore: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 }),
    soulGlow: new THREE.SpriteMaterial({ map: this.glow, color: '#9fd0ff', transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }),
    cursedGold: new THREE.MeshStandardMaterial({ color: '#e0602a', metalness: 0.7, roughness: 0.3, emissive: '#c01800', emissiveIntensity: 1.1 }),
    gem: new THREE.MeshBasicMaterial({ color: '#ff2a3a' }),
    cursedGlow: new THREE.SpriteMaterial({ map: this.glow, color: '#ff3020', transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }),
    halo: new THREE.MeshStandardMaterial({ color: '#ffe27a', metalness: 0.9, roughness: 0.2, emissive: '#ffb000', emissiveIntensity: 1 }),
    haloGlow: new THREE.SpriteMaterial({ map: this.glow, color: '#fff2a0', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }),
  };

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  private build(kind: PickupKind): THREE.Object3D {
    const g = new THREE.Group();
    const m = this.mats;
    if (kind === 'soul') {
      const robe = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.4, 7, 1, true), m.ghost);
      robe.position.y = 0.95;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), m.ghostCore);
      head.position.y = 1.85;
      g.add(robe, head);
      for (const s of [-1, 1]) {
        // arms raised, asking for help
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.75, 5), m.ghost);
        arm.position.set(s * 0.32, 1.85, 0);
        arm.rotation.z = s * -0.5;
        g.add(arm);
      }
      const glow = new THREE.Sprite(m.soulGlow);
      glow.scale.set(2.6, 3.2, 1);
      glow.position.y = 1.3;
      g.add(glow);
      g.scale.setScalar(1.2);
      g.userData.base = 1.2;
    } else if (kind === 'temptation') {
      const coin = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 10);
      const spots: [number, number, number][] = [[0, 0.05, 0], [0.35, 0.05, 0.1], [-0.3, 0.05, 0.15], [0.1, 0.05, -0.3], [-0.15, 0.13, -0.05], [0.2, 0.13, 0.05], [0, 0.21, 0.02], [-0.25, 0.05, -0.25], [0.3, 0.05, -0.2]];
      for (const [x, y, z] of spots) {
        const c = new THREE.Mesh(coin, m.cursedGold);
        c.position.set(x, y, z);
        c.rotation.set(Math.random() * 0.3, Math.random() * 3, Math.random() * 0.3);
        g.add(c);
      }
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.25, 0), m.gem);
      gem.position.y = 1.1;
      gem.name = 'gem';
      g.add(gem);
      const glow = new THREE.Sprite(m.cursedGlow);
      glow.scale.set(3.2, 3.2, 1);
      glow.position.y = 0.7;
      g.add(glow);
      g.scale.setScalar(1.5);
      g.userData.base = 1.5;
    } else {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 8, 24), m.halo);
      halo.name = 'halo';
      halo.position.y = 1.3;
      g.add(halo);
      const glow = new THREE.Sprite(m.haloGlow);
      glow.scale.set(2.2, 2.2, 1);
      glow.position.y = 1.3;
      g.add(glow);
    }
    return g;
  }

  sync(pickups: readonly PickupData[], distance: number, dt: number): void {
    this.time += dt;
    const g0 = groundHeight(distance);
    const seen = new Set<number>();
    for (const p of pickups) {
      if (p.taken) continue;
      seen.add(p.id);
      let a = this.active.get(p.id);
      if (!a) {
        const obj = this.pools[p.kind].pop() ?? this.build(p.kind);
        obj.visible = true;
        obj.scale.setScalar(obj.userData.base ?? 1);
        this.group.add(obj);
        a = { kind: p.kind, obj, data: p };
        this.active.set(p.id, a);
      }
      const bob = Math.sin(this.time * 2.5 + p.z) * 0.12;
      a.obj.position.set(laneX(p.lane), groundHeight(p.z) - g0 + p.y + bob, -(p.z - distance));
      if (p.kind === 'temptation') {
        const gem = a.obj.getObjectByName('gem');
        if (gem) gem.rotation.y = this.time * 2;
      } else if (p.kind === 'miracle') {
        const halo = a.obj.getObjectByName('halo');
        if (halo) halo.rotation.set(Math.sin(this.time) * 0.4, this.time * 2.5, 0);
      }
    }
    for (const [id, a] of this.active) {
      if (seen.has(id)) continue;
      this.active.delete(id);
      if (a.kind === 'soul' && a.data.taken) {
        // saved: rise up into the light
        this.rising.push({ obj: a.obj, t: 0, y: a.obj.position.y, z: a.data.z, x: a.obj.position.x });
      } else {
        this.release(a.kind, a.obj);
      }
    }
    for (let i = this.rising.length - 1; i >= 0; i--) {
      const r = this.rising[i];
      r.t += dt;
      r.obj.position.set(r.x, r.y + r.t * r.t * 6, -(r.z - distance));
      r.obj.scale.setScalar(Math.max(0.01, (r.obj.userData.base ?? 1) * (1 - r.t * 0.6)));
      if (r.t > 1.5) {
        this.release('soul', r.obj);
        this.rising.splice(i, 1);
      }
    }
  }

  private release(kind: PickupKind, obj: THREE.Object3D): void {
    obj.visible = false;
    this.group.remove(obj);
    this.pools[kind].push(obj);
  }

  /** Make the souls glow brighter in Hell's darkness, softer in Heaven. */
  setHeaven(on: boolean): void {
    this.mats.soulGlow.opacity = on ? 0.55 : 0.8;
  }
}
