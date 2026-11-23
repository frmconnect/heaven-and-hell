import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * Animated low-poly human (Quaternius "Animated Man", CC0 — see ASSETS.md), shared by the runner and the Devil.
 * Its colours come from a 5-band palette (skin, eyes, hair, shirt, trousers) that we paint ourselves,
 * so every outfit is just a new palette.
 */

/** The five colour bands of the model's texture, top to bottom, in 32 rows. */
export const PALETTE_BANDS = [
  { part: 'skin', rows: [0, 6] },
  { part: 'eyes', rows: [6, 11] },
  { part: 'hair', rows: [11, 17] },
  { part: 'shirt', rows: [17, 23] },
  { part: 'pants', rows: [23, 32] },
] as const;

export type PalettePart = (typeof PALETTE_BANDS)[number]['part'];
export type Palette = Record<PalettePart, string>;

/** Which palette part a row (0 = top, 31 = bottom) belongs to. */
export function partAtRow(row: number): PalettePart {
  const b = PALETTE_BANDS.find((x) => row >= x.rows[0] && row < x.rows[1]);
  return b ? b.part : 'pants';
}

function paletteCanvas(p: Palette): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 32;
  const g = c.getContext('2d')!;
  for (const b of PALETTE_BANDS) {
    g.fillStyle = p[b.part];
    g.fillRect(0, b.rows[0], 4, b.rows[1] - b.rows[0]);
  }
  return c;
}

export function paletteTexture(p: Palette): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(paletteCanvas(p));
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let human: Promise<GLTF | null> | null = null;

/** Load the shared character file once. Resolves to null if it can't load (the game keeps its simple shapes). */
export function loadHuman(): Promise<GLTF | null> {
  if (!human) {
    const base = (import.meta.env?.BASE_URL as string | undefined) ?? './';
    human = new GLTFLoader().loadAsync(`${base}models/human.glb`).catch((e) => {
      console.warn('Character model could not load; using simple shapes.', e);
      return null;
    });
  }
  return human;
}

/** One animated character in the scene, scaled to `height` metres, feet at y = 0, facing away from the camera. */
export class HumanFigure {
  readonly root = new THREE.Group();
  readonly material: THREE.MeshStandardMaterial;
  private mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private current: THREE.AnimationAction | null = null;
  private bones = new Map<string, THREE.Object3D>();
  private tmp = new THREE.Vector3();

  constructor(gltf: GLTF, height: number, palette: Palette) {
    const model = cloneSkinned(gltf.scene);
    this.material = new THREE.MeshStandardMaterial({ map: paletteTexture(palette), roughness: 0.85, flatShading: true });
    model.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const m = o as THREE.Mesh;
        m.material = this.material;
        m.frustumCulled = false; // skinned meshes move outside their resting box
      }
      if ((o as THREE.Bone).isBone) this.bones.set(o.name, o);
    });
    // normalise size from the skeleton (head top to toes): the skinned mesh's own box is in other units
    const span = () => {
      model.updateMatrixWorld(true);
      const y = (n: string) => this.bones.get(n)?.getWorldPosition(this.tmp).y;
      const top = y('HeadTop_End') ?? y('Head') ?? 1;
      const bottom = Math.min(y('LeftToe_End') ?? y('LeftFoot') ?? 0, y('RightToe_End') ?? y('RightFoot') ?? 0);
      return { top, bottom };
    };
    const a = span();
    model.scale.multiplyScalar(height / Math.max(1e-6, a.top - a.bottom));
    const b = span();
    model.position.y -= b.bottom;
    model.rotation.y = Math.PI; // the file faces the camera; the game's characters run into the screen
    this.root.add(model);
    this.mixer = new THREE.AnimationMixer(model);
    for (const clip of gltf.animations) this.actions.set(clip.name, this.mixer.clipAction(clip));
  }

  setPalette(p: Palette): void {
    this.material.map?.dispose();
    this.material.map = paletteTexture(p);
    this.material.needsUpdate = true;
  }

  has(name: string): boolean {
    return this.actions.has(name);
  }

  /** Switch animation (cross-fades). once = play one time and hold the last frame. */
  play(name: string, fade = 0.12, once = false, startAt = 0): THREE.AnimationAction | null {
    const a = this.actions.get(name);
    if (!a) return null;
    if (a === this.current && !once) return a;
    a.reset();
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = once;
    a.time = startAt;
    a.enabled = true;
    a.setEffectiveWeight(1);
    a.play();
    if (this.current && this.current !== a) this.current.crossFadeTo(a, fade, false);
    this.current = a;
    return a;
  }

  get playing(): string {
    return this.current?.getClip().name ?? '';
  }

  setSpeed(timeScale: number): void {
    if (this.current) this.current.timeScale = timeScale;
  }

  update(dt: number): void {
    this.mixer.update(dt);
  }

  /** A bone's position in `space` (e.g. the character's root), for attaching horns, wings, a halo. */
  bonePosition(name: string, space: THREE.Object3D, out = new THREE.Vector3()): THREE.Vector3 | null {
    const b = this.bones.get(name);
    if (!b) return null;
    b.getWorldPosition(this.tmp);
    return out.copy(space.worldToLocal(this.tmp));
  }
}
