import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CONFIG } from '../core/config';
import { basaltTexture, rockTexture } from './hell/textures';
import { bridgeTexture, cloudTexture, cosmicFloorTexture, gardenPathTexture, goldTileTexture, marbleTexture, nebulaTexture } from './heaven/textures';
import { STAGES, type ThemeId } from './journey';

export const TRACK_WIDTH = CONFIG.lanes.width * CONFIG.lanes.count + 0.8;
export const TILE = CONFIG.track.tileLength;

/** Shared materials, created once (re-using materials keeps phones fast). */
const M = (() => {
  const floorTex = basaltTexture();
  floorTex.repeat.set(1.5, 2);
  const marble = marbleTexture();
  marble.repeat.set(2, 2);
  const garden = gardenPathTexture();
  garden.repeat.set(2, 3);
  const bridge = bridgeTexture();
  bridge.repeat.set(1, 2);
  const gold = goldTileTexture();
  gold.repeat.set(2, 2);
  const cosmic = cosmicFloorTexture();
  cosmic.repeat.set(1, 2);
  return {
    basalt: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95, emissive: '#ff3300', emissiveMap: floorTex, emissiveIntensity: 0.35 }),
    hellEdge: new THREE.MeshBasicMaterial({ color: '#ff6a1a' }),
    rock: new THREE.MeshStandardMaterial({ map: rockTexture(), roughness: 1, color: '#7a4a40', flatShading: true }),
    iron: new THREE.MeshStandardMaterial({ color: '#2a1a18', roughness: 0.6, metalness: 0.6 }),
    flame: new THREE.MeshBasicMaterial({ color: '#ffb02a', transparent: true, opacity: 0.9 }),
    marble: new THREE.MeshStandardMaterial({ map: marble, roughness: 0.5, metalness: 0.05, color: '#e4e0d8' }),
    marblePlain: new THREE.MeshStandardMaterial({ color: '#f2eee6', roughness: 0.4, flatShading: true }),
    gold: new THREE.MeshStandardMaterial({ color: '#e8b84a', roughness: 0.25, metalness: 0.9, emissive: '#6a4400', emissiveIntensity: 0.3 }),
    garden: new THREE.MeshStandardMaterial({ map: garden, roughness: 0.9 }),
    grass: new THREE.MeshStandardMaterial({ color: '#86c060', roughness: 1, flatShading: true }),
    leaf: new THREE.MeshStandardMaterial({ color: '#7cc46a', roughness: 0.9, flatShading: true }),
    blossom: new THREE.MeshStandardMaterial({ color: '#ffc2dc', roughness: 0.9, flatShading: true }),
    bark: new THREE.MeshStandardMaterial({ color: '#a77e5a', roughness: 1, flatShading: true }),
    water: new THREE.MeshStandardMaterial({ color: '#9ad8ff', roughness: 0.1, metalness: 0.2, emissive: '#4aa8ff', emissiveIntensity: 0.4 }),
    bridge: new THREE.MeshStandardMaterial({ map: bridge, color: '#c4d2ee', roughness: 0.3, metalness: 0.1, emissive: '#6a90d8', emissiveIntensity: 0.15 }),
    crystal: new THREE.MeshStandardMaterial({ color: '#cfe6ff', roughness: 0.1, emissive: '#7ab0ff', emissiveIntensity: 0.9, transparent: true, opacity: 0.9 }),
    islandRock: new THREE.MeshStandardMaterial({ color: '#9a8aa8', roughness: 1, flatShading: true }),
    goldTiles: new THREE.MeshStandardMaterial({ map: gold, roughness: 0.3, metalness: 0.7, emissive: '#5a3a00', emissiveIntensity: 0.25 }),
    glowWhite: new THREE.MeshBasicMaterial({ color: '#fffbe8' }),
    cosmicFloor: new THREE.MeshStandardMaterial({ map: cosmic, roughness: 0.2, metalness: 0.3, emissive: '#ffffff', emissiveMap: cosmic, emissiveIntensity: 0.55 }),
    neonCyan: new THREE.MeshBasicMaterial({ color: '#7fe8ff' }),
    planetA: new THREE.MeshStandardMaterial({ color: '#c88aff', roughness: 0.8, flatShading: true, emissive: '#4a1a8a', emissiveIntensity: 0.5 }),
    planetB: new THREE.MeshStandardMaterial({ color: '#6ab8ff', roughness: 0.8, flatShading: true, emissive: '#1a3a8a', emissiveIntensity: 0.5 }),
    ring: new THREE.MeshBasicMaterial({ color: '#ffe0a8', transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
    violetCrystal: new THREE.MeshStandardMaterial({ color: '#a070ff', roughness: 0.1, emissive: '#6a2aff', emissiveIntensity: 0.9, flatShading: true }),
    cloud: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true, emissive: '#c8d4f0', emissiveIntensity: 0.35 }),
    goldCloud: new THREE.MeshStandardMaterial({ color: '#fff0c8', roughness: 1, flatShading: true, emissive: '#e8c070', emissiveIntensity: 0.3 }),
  };
})();
export const MATERIALS = M;

const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 8),
  cone5: new THREE.ConeGeometry(1, 1, 5),
  ico: new THREE.IcosahedronGeometry(1, 0),
  sphere: new THREE.SphereGeometry(1, 8, 6),
};

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, sx: number, sy: number, sz: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  return m;
}

/** Gold railing along one side of a tile (posts + a rail), rising by `rise` over the tile. */
function railing(side: number, rise: number, postEvery = 2.5): THREE.Group {
  const g = new THREE.Group();
  const x = side * (TRACK_WIDTH / 2 - 0.1);
  for (let z = -TILE / 2; z < TILE / 2; z += postEvery) {
    const y = rise * ((TILE / 2 - z) / TILE);
    g.add(mesh(G.cyl, M.gold, 0.06, 1.0, 0.06, x, y + 0.5, z));
  }
  const rail = mesh(G.box, M.gold, 0.1, 0.1, Math.hypot(TILE, rise), x, rise / 2 + 1.0, 0);
  rail.rotation.x = Math.atan2(rise, TILE);
  g.add(rail);
  return g;
}

let stairGeo: THREE.BufferGeometry | null = null;
/** Ten marble steps rising across one tile. */
function stairSteps(slope: number): THREE.BufferGeometry {
  if (stairGeo) return stairGeo;
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < TILE; i++) {
    const top = (i + 0.5) * slope;
    const b = new THREE.BoxGeometry(TRACK_WIDTH, top + 1.2, 1.0);
    b.translate(0, (top - 1.2) / 2, TILE / 2 - (i + 0.5));
    parts.push(b);
  }
  stairGeo = mergeGeometries(parts) ?? new THREE.BoxGeometry(TRACK_WIDTH, 1, TILE);
  return stairGeo;
}

export interface TileBuild {
  obj: THREE.Object3D;
  /** true: geometry already rises with the stairs; position at the tile's start height */
  stepped: boolean;
}

/** One 10 m piece of track floor in the given world's style. */
export function buildTile(theme: ThemeId): TileBuild {
  const g = new THREE.Group();
  const flat = (mat: THREE.Material, h = 0.8) => g.add(mesh(G.box, mat, TRACK_WIDTH, h, TILE, 0, -h / 2, 0));
  switch (theme) {
    case 'hell':
      flat(M.basalt);
      for (const s of [-1, 1]) g.add(mesh(G.box, M.hellEdge, 0.12, 0.1, TILE, s * (TRACK_WIDTH / 2), 0.02, 0));
      return { obj: g, stepped: false };
    case 'stairway': {
      const slope = STAGES.find((s) => s.id === 'stairway')?.slope ?? 0.2;
      g.add(new THREE.Mesh(stairSteps(slope), M.marble));
      for (const s of [-1, 1]) g.add(railing(s, slope * TILE));
      return { obj: g, stepped: true };
    }
    case 'gate':
      flat(M.marble);
      g.add(mesh(G.box, M.gold, 0.5, 0.04, TILE, 0, 0.01, 0));
      for (const s of [-1, 1]) g.add(mesh(G.box, M.gold, 0.25, 0.12, TILE, s * (TRACK_WIDTH / 2), 0.02, 0));
      return { obj: g, stepped: false };
    case 'gardens':
      flat(M.garden);
      for (const s of [-1, 1]) g.add(mesh(G.box, M.grass, 4, 0.8, TILE, s * (TRACK_WIDTH / 2 + 2), -0.42, 0));
      return { obj: g, stepped: false };
    case 'bridges':
      flat(M.bridge, 0.4);
      g.add(mesh(G.box, M.gold, TRACK_WIDTH + 0.2, 0.25, 0.4, 0, -0.5, 0));
      for (const s of [-1, 1]) g.add(railing(s, 0, 2));
      return { obj: g, stepped: false };
    case 'god':
      flat(M.marble);
      g.add(mesh(G.box, M.glowWhite, 1.2, 0.04, TILE, 0, 0.01, 0));
      for (const s of [-1, 1]) g.add(mesh(G.box, M.gold, 0.3, 0.3, TILE, s * (TRACK_WIDTH / 2), 0.1, 0));
      return { obj: g, stepped: false };
    case 'cosmic':
      flat(M.cosmicFloor, 0.4);
      for (const s of [-1, 1]) g.add(mesh(G.box, M.neonCyan, 0.1, 0.1, TILE, s * (TRACK_WIDTH / 2), 0.03, 0));
      return { obj: g, stepped: false };
    case 'kingdom':
      flat(M.goldTiles);
      for (const s of [-1, 1]) g.add(mesh(G.box, M.gold, 0.3, 0.3, TILE, s * (TRACK_WIDTH / 2), 0.1, 0));
      return { obj: g, stepped: false };
  }
}

export interface DecorSpec {
  build: () => THREE.Object3D;
  minX: number;
  maxX: number;
  y?: [number, number];
  scale?: [number, number];
}

function cloudPuff(mat: THREE.Material = M.cloud): THREE.Object3D {
  const g = new THREE.Group();
  const blobs: [number, number, number, number][] = [[0, 0, 0, 2.2], [2, -0.3, 0.3, 1.6], [-2, -0.4, -0.2, 1.7], [0.8, 0.9, -0.4, 1.4], [-1, 0.7, 0.6, 1.2]];
  for (const [x, y, z, r] of blobs) g.add(mesh(G.ico, mat, r, r * 0.75, r, x, y, z));
  return g;
}

function goldColumn(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(mesh(G.box, M.marblePlain, 0.9, 0.3, 0.9, 0, 0.15));
  g.add(mesh(G.cyl, M.marblePlain, 0.32, 3.4, 0.32, 0, 1.95));
  g.add(mesh(G.box, M.gold, 0.85, 0.3, 0.85, 0, 3.8));
  g.add(mesh(G.sphere, M.glowWhite, 0.28, 0.28, 0.28, 0, 4.25));
  return g;
}

function angelStatue(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(mesh(G.box, M.marblePlain, 1.4, 1.2, 1.4, 0, 0.6));
  g.add(mesh(G.cone5, M.marblePlain, 0.7, 2.4, 0.7, 0, 2.4));
  g.add(mesh(G.sphere, M.marblePlain, 0.32, 0.32, 0.32, 0, 3.9));
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 6, 16), M.gold);
  halo.position.set(0, 4.35, 0);
  halo.rotation.x = Math.PI / 2;
  g.add(halo);
  for (const s of [-1, 1]) {
    const w = mesh(G.box, M.marblePlain, 1.6, 1.8, 0.08, s * 0.9, 3.1, 0.25);
    w.rotation.z = s * -0.35;
    w.rotation.y = s * 0.3;
    g.add(w);
  }
  return g;
}

function tree(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(mesh(G.cyl, M.bark, 0.22, 2.4, 0.22, 0, 1.2));
  g.add(mesh(G.ico, M.leaf, 1.5, 1.3, 1.5, 0, 3.1));
  g.add(mesh(G.ico, M.blossom, 1.0, 0.9, 1.0, 0.6, 3.9, 0.3));
  g.add(mesh(G.ico, M.leaf, 0.9, 0.8, 0.9, -0.8, 3.6, -0.3));
  return g;
}

function bush(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(mesh(G.ico, M.leaf, 0.8, 0.6, 0.8, 0, 0.4));
  for (let i = 0; i < 5; i++) g.add(mesh(G.sphere, M.blossom, 0.14, 0.14, 0.14, Math.cos(i * 1.3) * 0.6, 0.7 + (i % 2) * 0.15, Math.sin(i * 1.3) * 0.6));
  return g;
}

function fountain(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(mesh(G.cyl, M.marblePlain, 2, 0.5, 2, 0, 0.25));
  g.add(mesh(G.cyl, M.water, 1.8, 0.1, 1.8, 0, 0.5));
  g.add(mesh(G.cyl, M.marblePlain, 0.25, 1.6, 0.25, 0, 1.2));
  g.add(mesh(G.cyl, M.marblePlain, 0.9, 0.25, 0.9, 0, 2.0));
  g.add(mesh(G.cone5, M.water, 0.35, 0.9, 0.35, 0, 2.6));
  return g;
}

function floatingIsland(): THREE.Object3D {
  const g = new THREE.Group();
  const rock = mesh(G.cone5, M.islandRock, 3, 4, 3, 0, -2);
  rock.rotation.x = Math.PI;
  g.add(rock);
  g.add(mesh(G.cyl, M.grass, 3, 0.4, 3, 0, 0.2));
  g.add(mesh(G.cyl, M.bark, 0.15, 1.4, 0.15, 0.6, 1.1));
  g.add(mesh(G.ico, M.blossom, 0.8, 0.7, 0.8, 0.6, 2.1));
  return g;
}

function crystalLamp(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(mesh(G.cyl, M.gold, 0.06, 2.6, 0.06, 0, 1.3));
  const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), M.crystal);
  c.position.y = 2.9;
  g.add(c);
  return g;
}

function goldTower(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(mesh(G.cyl, M.marblePlain, 1.4, 9, 1.4, 0, 4.5));
  g.add(mesh(G.cyl, M.gold, 1.55, 0.5, 1.55, 0, 9.2));
  g.add(mesh(G.cone5, M.gold, 1.6, 3.5, 1.6, 0, 11.2));
  g.add(mesh(G.sphere, M.glowWhite, 0.3, 0.3, 0.3, 0, 13.1));
  return g;
}

function temple(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(mesh(G.box, M.marblePlain, 8, 0.8, 5, 0, 0.4));
  for (let i = 0; i < 5; i++) for (const z of [-2, 2]) g.add(mesh(G.cyl, M.marblePlain, 0.3, 4, 0.3, -3.2 + i * 1.6, 2.8, z));
  g.add(mesh(G.box, M.gold, 8.4, 0.6, 5.4, 0, 5.1));
  const roof = mesh(G.cone5, M.gold, 5, 2, 3.4, 0, 6.4);
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  return g;
}

function spire(): THREE.Object3D {
  const m = new THREE.Mesh(G.cone5, M.rock);
  m.scale.set(1.8, 10, 1.8);
  m.position.y = 3.8;
  const g = new THREE.Group();
  g.add(m);
  return g;
}

const flames: THREE.Mesh[] = [];
export const decorFlames = flames;
function brazier(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(mesh(G.cyl, M.iron, 0.14, 1.6, 0.14, 0, 0.8));
  g.add(mesh(G.cyl, M.iron, 0.45, 0.4, 0.3, 0, 1.7));
  const f = mesh(G.cone5, M.flame, 0.35, 1.1, 0.35, 0, 2.3);
  flames.push(f);
  g.add(f);
  return g;
}

function planet(): THREE.Object3D {
  const g = new THREE.Group();
  const big = Math.random() < 0.5;
  g.add(mesh(G.ico, big ? M.planetA : M.planetB, 3, 3, 3));
  const ring = new THREE.Mesh(new THREE.RingGeometry(4, 5.6, 32), M.ring);
  ring.rotation.x = Math.PI / 2.4;
  g.add(ring);
  return g;
}

function crystalSpire(): THREE.Object3D {
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), M.violetCrystal);
  c.scale.set(0.8, 4, 0.8);
  c.position.y = 2;
  g.add(c);
  const c2 = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), M.violetCrystal);
  c2.scale.set(0.45, 2.2, 0.45);
  c2.position.set(0.9, 1, 0.3);
  c2.rotation.z = -0.3;
  g.add(c2);
  return g;
}

function starOrb(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(mesh(G.cyl, M.neonCyan, 0.05, 2.6, 0.05, 0, 1.3));
  g.add(mesh(G.sphere, M.glowWhite, 0.3, 0.3, 0.3, 0, 2.8));
  return g;
}

const near = TRACK_WIDTH / 2;
/** Roadside decorations for each world. */
export const DECOR: Record<ThemeId, DecorSpec[]> = {
  hell: [
    { build: spire, minX: near + 3, maxX: 30, scale: [0.6, 1.6] },
    { build: spire, minX: near + 6, maxX: 34, scale: [0.8, 1.8] },
    { build: brazier, minX: near + 0.6, maxX: near + 0.6 },
  ],
  stairway: [
    { build: goldColumn, minX: near + 0.7, maxX: near + 0.7 },
    { build: angelStatue, minX: near + 3, maxX: near + 6 },
    { build: cloudPuff, minX: near + 8, maxX: 40, y: [-6, 2], scale: [1, 2.5] },
  ],
  gate: [
    { build: cloudPuff, minX: near + 4, maxX: 30, y: [-3, 1], scale: [1.2, 2.5] },
    { build: goldColumn, minX: near + 0.7, maxX: near + 0.7 },
  ],
  gardens: [
    { build: tree, minX: near + 3, maxX: 22, scale: [0.8, 1.4] },
    { build: bush, minX: near + 0.8, maxX: near + 4 },
    { build: fountain, minX: near + 6, maxX: 14 },
    { build: tree, minX: near + 8, maxX: 30, scale: [1, 1.8] },
  ],
  bridges: [
    { build: crystalLamp, minX: near + 0.2, maxX: near + 0.2 },
    { build: floatingIsland, minX: near + 10, maxX: 40, y: [-6, 8], scale: [0.7, 1.6] },
    { build: cloudPuff, minX: near + 6, maxX: 40, y: [-16, -6], scale: [1.5, 3] },
  ],
  god: [
    { build: () => cloudPuff(M.goldCloud), minX: near + 2, maxX: 26, y: [-2, 3], scale: [1.4, 3] },
    { build: goldColumn, minX: near + 0.7, maxX: near + 0.7 },
  ],
  cosmic: [
    { build: starOrb, minX: near + 0.3, maxX: near + 0.3 },
    { build: crystalSpire, minX: near + 4, maxX: 26, scale: [0.8, 2] },
    { build: planet, minX: near + 18, maxX: 50, y: [4, 22], scale: [0.6, 1.6] },
  ],
  kingdom: [
    { build: goldColumn, minX: near + 0.7, maxX: near + 0.7 },
    { build: goldTower, minX: near + 7, maxX: 30, scale: [0.8, 1.6] },
    { build: temple, minX: near + 14, maxX: 34 },
  ],
};

/** The "ground below" for each world: a cloud sea, a meadow, golden clouds… (Hell has its lava sea instead.) */
export interface SeaSpec {
  material: THREE.Material;
  y: number; // relative to the track's ground at that point
}
const cloudTex = cloudTexture();
cloudTex.repeat.set(6, 1);
const goldCloudTex = cloudTexture('#fff3c8', 'rgba(240,200,120,0.95)');
goldCloudTex.repeat.set(6, 1);
const cloudSea = new THREE.MeshStandardMaterial({ map: cloudTex, roughness: 1, emissive: '#ffffff', emissiveMap: cloudTex, emissiveIntensity: 0.35, transparent: true, opacity: 0.95 });
export const CLOUD_TEXTURES = [cloudTex, goldCloudTex];
export const SEAS: Partial<Record<ThemeId, SeaSpec>> = {
  stairway: { material: cloudSea, y: -14 },
  gate: { material: cloudSea, y: -3 },
  gardens: { material: new THREE.MeshStandardMaterial({ color: '#8cc868', roughness: 1 }), y: -0.6 },
  bridges: { material: cloudSea, y: -24 },
  god: { material: cloudSea, y: -4 },
  cosmic: { material: new THREE.MeshBasicMaterial({ map: (() => { const t = nebulaTexture(); t.repeat.set(4, 1); return t; })() }), y: -30 },
  kingdom: { material: new THREE.MeshStandardMaterial({ map: goldCloudTex, roughness: 1, emissive: '#ffe0a0', emissiveMap: goldCloudTex, emissiveIntensity: 0.4 }), y: -6 },
};
