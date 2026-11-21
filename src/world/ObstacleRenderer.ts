import * as THREE from 'three';
import { laneX } from '../core/config';
import { rockTexture, lavaTexture } from './hell/textures';
import { SHAPES, type ObstacleData, type ObstacleKind } from './obstacles';

/**
 * Draws obstacles. Meshes are pooled (re-used) instead of created and destroyed,
 * which keeps phones running smoothly.
 */
export class ObstacleRenderer {
  readonly group = new THREE.Group();
  private pools: Record<ObstacleKind, THREE.Object3D[]> = { low: [], high: [], wall: [], lava: [] };
  private active = new Map<number, { kind: ObstacleKind; obj: THREE.Object3D }>();
  private mats = {
    stone: new THREE.MeshStandardMaterial({ color: '#4a2a24', roughness: 0.9, flatShading: true }),
    rock: new THREE.MeshStandardMaterial({ map: rockTexture(), color: '#a06a5a', roughness: 1, flatShading: true, emissive: '#ff2200', emissiveIntensity: 0.15 }),
    glow: new THREE.MeshBasicMaterial({ color: '#ff7a1a' }),
    beam: new THREE.MeshStandardMaterial({ color: '#2e1612', roughness: 0.7, emissive: '#ff3a00', emissiveIntensity: 0.6 }),
    iron: new THREE.MeshStandardMaterial({ color: '#251512', roughness: 0.5, metalness: 0.7 }),
    flame: new THREE.MeshBasicMaterial({ color: '#ffc040', transparent: true, opacity: 0.9 }),
    lava: new THREE.MeshBasicMaterial({ map: lavaTexture(), color: '#ffffff' }),
    rim: new THREE.MeshStandardMaterial({ color: '#120808', roughness: 1 }),
  };
  private geos = {
    box: new THREE.BoxGeometry(1, 1, 1),
    flame: new THREE.ConeGeometry(0.22, 0.8, 5),
    wall: new THREE.DodecahedronGeometry(1, 0),
  };
  private flames: THREE.Mesh[] = [];
  private time = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  private build(kind: ObstacleKind): THREE.Object3D {
    const s = SHAPES[kind];
    const g = new THREE.Group();
    const { box } = this.geos;
    const m = this.mats;
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z = 0) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.set(sx, sy, sz);
      mesh.position.set(x, y, z);
      g.add(mesh);
      return mesh;
    };
    if (kind === 'low') {
      // stone barrier with a line of fire on top: JUMP
      add(box, m.stone, s.width, s.top - 0.1, s.length, 0, (s.top - 0.1) / 2);
      add(box, m.glow, s.width, 0.08, s.length + 0.02, 0, s.top - 0.06);
      for (let i = -2; i <= 2; i++) this.flames.push(add(this.geos.flame, m.flame, 1, 1, 1, i * 0.38, s.top + 0.3));
    } else if (kind === 'high') {
      // burning beam on iron posts: SLIDE
      add(box, m.iron, 0.18, s.top, 0.18, -s.width / 2, s.top / 2);
      add(box, m.iron, 0.18, s.top, 0.18, s.width / 2, s.top / 2);
      add(box, m.beam, s.width, 0.7, s.length, 0, s.bottom + 0.35);
      add(box, m.glow, s.width, 0.06, s.length + 0.02, 0, s.bottom + 0.02);
      add(box, m.beam, s.width, 0.25, 0.3, 0, s.top - 0.4);
      for (let i = -1; i <= 1; i++) this.flames.push(add(this.geos.flame, m.flame, 1.2, 1.2, 1.2, i * 0.6, s.bottom + 1.05));
    } else if (kind === 'wall') {
      // jagged rock: GO AROUND
      const rock = add(this.geos.wall, m.rock, s.width * 0.6, s.top * 0.55, s.length * 0.7, 0, s.top * 0.5);
      rock.rotation.y = 0.4;
      add(this.geos.wall, m.rock, 0.5, 0.6, 0.5, 0.5, s.top * 0.95);
    } else {
      // lava pit: JUMP across
      add(box, m.lava, s.width - 0.2, 0.05, s.length - 0.2, 0, 0.03);
      add(box, m.rim, s.width, 0.08, 0.25, 0, 0.04, s.length / 2);
      add(box, m.rim, s.width, 0.08, 0.25, 0, 0.04, -s.length / 2);
    }
    return g;
  }

  /** Match the meshes to the current list of obstacles. */
  sync(obstacles: readonly ObstacleData[], distance: number, dt: number): void {
    this.time += dt;
    const seen = new Set<number>();
    for (const o of obstacles) {
      seen.add(o.id);
      let a = this.active.get(o.id);
      if (!a) {
        const obj = this.pools[o.kind].pop() ?? this.build(o.kind);
        obj.visible = true;
        obj.rotation.set(0, 0, 0);
        obj.scale.setScalar(1);
        this.group.add(obj);
        a = { kind: o.kind, obj };
        this.active.set(o.id, a);
      }
      a.obj.position.set(laneX(o.lane), 0, -(o.z - distance));
      // barriers you stumble through get knocked over
      if (o.hit && (o.kind === 'low' || o.kind === 'high')) {
        a.obj.rotation.x = Math.max(a.obj.rotation.x - dt * 8, -1.4);
        a.obj.scale.setScalar(Math.max(0.01, a.obj.scale.x - dt * 2));
      }
    }
    for (const [id, a] of this.active) {
      if (seen.has(id)) continue;
      a.obj.visible = false;
      this.group.remove(a.obj);
      this.pools[a.kind].push(a.obj);
      this.active.delete(id);
    }
    for (let i = 0; i < this.flames.length; i++) {
      const k = 1 + Math.sin(this.time * 14 + i * 2.3) * 0.18;
      this.flames[i].scale.y = k;
    }
  }
}
