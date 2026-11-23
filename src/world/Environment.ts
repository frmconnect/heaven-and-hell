import * as THREE from 'three';
import { CONFIG } from '../core/config';
import { Rng } from '../core/rng';
import { CLOUD_TEXTURES, DECOR, SEAS, TILE, buildTile, decorFlames, type DecorSpec } from './decor';
import { GateSet } from './GateSet';
import { lavaTexture } from './hell/textures';
import { stageStart } from './journey';
import { JOURNEY_MAP, type WorldMap } from './worldMap';
import { LOOKS, type ThemeLook } from './themes';

const TILE_COUNT = Math.ceil((CONFIG.track.viewAhead + 60) / TILE);
const DECOR_SPACING = 7;
const SEA_TILE = 40;
const SEA_COUNT = 9;
const BLEND_METRES = 140; // distance over which the sky and light change into the next world

/** Cheap repeatable "random" number from a slot number. */
function hash(n: number, salt = 0): number {
  const x = Math.sin(n * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

interface Pooled {
  key: string;
  obj: THREE.Object3D;
}

/**
 * Draws the world around the track for the whole journey. The track is cut into tiles and
 * each tile takes the look of the stage it belongs to, so you see the Stairway rising ahead
 * before you reach it. The player stays at z = 0; the world scrolls (and climbs) past them.
 */
export class Environment {
  readonly group = new THREE.Group();
  private pools = new Map<string, THREE.Object3D[]>();
  private tiles = new Map<number, Pooled>();
  private decor = new Map<number, Pooled>();
  private seas = new Map<number, Pooled>();
  private lavaTex: THREE.CanvasTexture;
  private lavaMat: THREE.MeshBasicMaterial;
  private lava: THREE.Mesh;
  private volcano = new THREE.Group();
  private sun: THREE.Mesh;
  private hemi: THREE.HemisphereLight;
  private key: THREE.DirectionalLight;
  private fireLight: THREE.PointLight;
  private particles: THREE.Points;
  private particleMat: THREE.PointsMaterial;
  private particleVel: Float32Array;
  private gate: GateSet;
  private fog: THREE.Fog;
  private bg = new THREE.Color();
  private time = 0;
  private c1 = new THREE.Color();
  private c2 = new THREE.Color();
  /** for tone mapping exposure, read by the game each frame */
  exposure = 1;
  private map: WorldMap = JOURNEY_MAP;
  private stars: THREE.Points;
  private starMat: THREE.PointsMaterial;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    this.fog = new THREE.Fog('#2a0804', 28, 150);
    scene.fog = this.fog;
    scene.background = this.bg;

    this.hemi = new THREE.HemisphereLight('#ff7a4a', '#5a0a00', 1.1);
    this.key = new THREE.DirectionalLight('#ffb27a', 1.4);
    this.key.position.set(-4, 10, 6);
    this.fireLight = new THREE.PointLight('#ff5a1a', 30, 18, 1.6);
    this.fireLight.position.set(0, 3, -2);
    this.group.add(this.hemi, this.key, this.fireLight);

    // Hell's lava sea. It stays at Hell's level, so as you climb the Stairway, Hell drops away below you.
    this.lavaTex = lavaTexture();
    this.lavaTex.repeat.set(12, 30);
    this.lavaMat = new THREE.MeshBasicMaterial({ map: this.lavaTex, color: '#ffffff' });
    this.lava = new THREE.Mesh(new THREE.PlaneGeometry(240, 400), this.lavaMat);
    this.lava.rotation.x = -Math.PI / 2;
    this.group.add(this.lava);

    // distant volcano in Hell
    const v = new THREE.Mesh(new THREE.ConeGeometry(70, 60, 7, 1, true), new THREE.MeshBasicMaterial({ color: '#120202', fog: false }));
    const vg = new THREE.Mesh(new THREE.SphereGeometry(14, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff4a0a', fog: false, transparent: true, opacity: 0.7 }));
    vg.position.set(0, 30, -2);
    vg.scale.y = 0.5;
    this.volcano.add(v, vg);
    this.volcano.position.set(30, 10, -320);
    this.group.add(this.volcano);

    // heavenly light far ahead (God's light, getting closer)
    // soft glowing disc (a radial gradient), always facing the camera
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 128;
    const gc = glowCanvas.getContext('2d');
    if (gc) {
      const grad = gc.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255,255,250,1)');
      grad.addColorStop(0.25, 'rgba(255,248,220,0.9)');
      grad.addColorStop(0.6, 'rgba(255,230,170,0.3)');
      grad.addColorStop(1, 'rgba(255,220,150,0)');
      gc.fillStyle = grad;
      gc.fillRect(0, 0, 128, 128);
    }
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    glowTex.colorSpace = THREE.SRGBColorSpace;
    this.sun = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), new THREE.MeshBasicMaterial({ map: glowTex, fog: false, transparent: true, opacity: 0, depthWrite: false }));
    this.sun.position.set(0, 70, -360);
    this.group.add(this.sun);

    // floating particles: embers in Hell, light motes and petals in Heaven
    const n = 260;
    const pos = new Float32Array(n * 3);
    this.particleVel = new Float32Array(n);
    const r = new Rng(77);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = r.range(-25, 25);
      pos[i * 3 + 1] = r.range(-1, 12);
      pos[i * 3 + 2] = r.range(-80, 8);
      this.particleVel[i] = r.range(0.5, 1.5);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.particleMat = new THREE.PointsMaterial({ color: '#ffa040', size: 0.14, transparent: true, opacity: 0.85, depthWrite: false });
    this.particles = new THREE.Points(geo, this.particleMat);
    this.particles.frustumCulled = false;
    this.group.add(this.particles);

    this.gate = new GateSet(scene);

    // starfield for the Cosmic Heavens (only visible there)
    const sn = 500;
    const sp = new Float32Array(sn * 3);
    for (let i = 0; i < sn; i++) {
      const a = r.range(0, Math.PI * 2), e = r.range(0.05, 1.2), dist = 300;
      sp[i * 3] = Math.cos(a) * Math.cos(e) * dist;
      sp[i * 3 + 1] = Math.sin(e) * dist * 0.7 - 20;
      sp[i * 3 + 2] = -Math.abs(Math.sin(a)) * Math.cos(e) * dist - 40;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: true, fog: false, transparent: true, opacity: 0, depthWrite: false });
    this.stars = new THREE.Points(sg, this.starMat);
    this.stars.frustumCulled = false;
    this.group.add(this.stars);
  }

  private low = false;

  /** Graphics quality: Low skips half the roadside scenery and the floating particles (older phones). */
  setQuality(low: boolean): void {
    if (low === this.low) return;
    this.low = low;
    this.particles.visible = !low;
    for (const p of this.decor.values()) this.give(p);
    this.decor.clear();
  }

  /** Switch between the journey and the Ascended State map; clears the old world. */
  setMap(map: WorldMap): void {
    if (map === this.map) return;
    this.map = map;
    for (const m of [this.tiles, this.decor, this.seas]) {
      for (const p of m.values()) this.give(p);
      m.clear();
    }
  }

  private take(key: string, build: () => THREE.Object3D): THREE.Object3D {
    const obj = this.pools.get(key)?.pop() ?? build();
    obj.visible = true;
    this.group.add(obj);
    return obj;
  }

  private give(p: Pooled): void {
    p.obj.visible = false;
    this.group.remove(p.obj);
    let list = this.pools.get(p.key);
    if (!list) this.pools.set(p.key, (list = []));
    list.push(p.obj);
  }

  /** Keep a set of slots filled for the visible range; recycle the rest. */
  private syncSlots(map: Map<number, Pooled>, first: number, last: number, make: (k: number) => Pooled | null, place: (k: number, p: Pooled) => void): void {
    for (const [k, p] of map) {
      if (k < first || k > last) {
        this.give(p);
        map.delete(k);
      }
    }
    for (let k = first; k <= last; k++) {
      let p = map.get(k);
      if (!p) {
        const made = make(k);
        if (!made) continue;
        p = made;
        map.set(k, p);
      }
      place(k, p);
    }
  }

  update(dt: number, distance: number, speed: number): void {
    this.time += dt;
    const map = this.map;
    const journey = map.kind === 'journey';
    const g0 = map.ground(distance);
    const rel = (z: number) => map.ground(z) - g0;

    // floor tiles
    const firstTile = Math.floor((distance - 20) / TILE);
    this.syncSlots(
      this.tiles,
      firstTile,
      firstTile + TILE_COUNT,
      (k) => {
        const theme = map.stageAt(k * TILE + TILE / 2).id;
        const key = `tile:${theme}`;
        const obj = this.take(key, () => {
          const b = buildTile(theme);
          b.obj.userData.stepped = b.stepped;
          return b.obj;
        });
        return { key, obj };
      },
      (k, p) => {
        const start = k * TILE;
        const centre = start + TILE / 2;
        if (p.obj.userData.stepped) {
          p.obj.position.set(0, rel(start), -(centre - distance));
        } else {
          const slope = map.stageAt(centre).slope;
          p.obj.position.set(0, rel(centre), -(centre - distance));
          p.obj.rotation.x = Math.atan(slope);
        }
      },
    );

    // roadside decorations
    const firstDecor = Math.floor((distance - 20) / DECOR_SPACING);
    this.syncSlots(
      this.decor,
      firstDecor,
      firstDecor + Math.ceil((CONFIG.track.viewAhead + 60) / DECOR_SPACING),
      (k) => {
        const z = k * DECOR_SPACING;
        const theme = map.stageAt(z).id;
        // keep the Gate area clear of clutter
        if (map.gateZ !== null && Math.abs(z - map.gateZ) < 25) return null;
        if (this.low && k % 2 !== 0) return null;
        const specs = DECOR[theme];
        const i = Math.floor(hash(k, 1) * specs.length);
        const spec: DecorSpec = specs[i];
        const key = `decor:${theme}:${i}`;
        const obj = this.take(key, spec.build);
        const side = k % 2 === 0 ? -1 : 1;
        obj.userData.x = side * (spec.minX + (spec.maxX - spec.minX) * hash(k, 2));
        obj.userData.y = spec.y ? spec.y[0] + (spec.y[1] - spec.y[0]) * hash(k, 3) : 0;
        const sc = spec.scale ? spec.scale[0] + (spec.scale[1] - spec.scale[0]) * hash(k, 4) : 1;
        obj.scale.setScalar(sc);
        obj.rotation.y = hash(k, 5) * Math.PI * 2;
        return { key, obj };
      },
      (k, p) => {
        const z = k * DECOR_SPACING;
        p.obj.position.set(p.obj.userData.x, rel(z) + p.obj.userData.y, -(z - distance));
      },
    );

    // the ground far below / around: clouds, meadows
    const firstSea = Math.floor((distance - SEA_TILE) / SEA_TILE);
    this.syncSlots(
      this.seas,
      firstSea,
      firstSea + SEA_COUNT,
      (k) => {
        const theme = map.stageAt(k * SEA_TILE + SEA_TILE / 2).id;
        const spec = SEAS[theme];
        if (!spec) return null;
        const key = `sea:${theme}`;
        const obj = this.take(key, () => {
          const m = new THREE.Mesh(new THREE.PlaneGeometry(240, SEA_TILE), spec.material);
          m.rotation.x = -Math.PI / 2;
          return m;
        });
        obj.userData.y = spec.y;
        return { key, obj };
      },
      (k, p) => {
        const c = k * SEA_TILE + SEA_TILE / 2;
        p.obj.position.set(0, rel(c) + p.obj.userData.y, -(c - distance));
      },
    );
    for (const t of CLOUD_TEXTURES) t.offset.x = this.time * 0.01;

    // Hell's lava, always at Hell's level
    this.lava.position.set(0, -1.1 - g0, -170);
    this.lavaTex.offset.y = (distance * 30) / 400 + this.time * 0.02;
    this.lavaTex.offset.x = Math.sin(this.time * 0.3) * 0.05;
    const inHell = journey && distance < stageStart('stairway') + 80;
    this.lava.visible = journey && g0 < 260;
    const pulse = 0.85 + Math.sin(this.time * 2.1) * 0.08 + Math.sin(this.time * 5.3) * 0.04;
    this.lavaMat.color.setScalar(pulse);
    // above Hell, let its glow show through the fog so you can see what you escaped
    if (this.lavaMat.fog !== inHell) {
      this.lavaMat.fog = inHell;
      this.lavaMat.needsUpdate = true;
    }
    this.volcano.visible = inHell;
    this.volcano.position.y = 10 - g0;

    // God's light ahead grows as you go through Heaven
    const heaven = journey ? Math.max(0, Math.min(1, (distance - stageStart('stairway')) / 400)) : 1;
    (this.sun.material as THREE.MeshBasicMaterial).opacity = heaven * 0.9;
    this.sun.visible = heaven > 0;

    // sky, fog and light: blend from the previous world into this one
    const idx = map.stageIndexAt(distance);
    const cur = LOOKS[map.stageAt(distance).id];
    const prev = LOOKS[map.prevStageAt(distance).id];
    const t = idx === 0 ? 1 : THREE.MathUtils.smoothstep(distance - map.stageStartAt(distance), 0, BLEND_METRES);
    this.applyLook(prev, cur, t);
    const starsOn = this.mix(prev.stars ?? 0, cur.stars ?? 0, t);
    this.starMat.opacity = starsOn;
    this.stars.visible = starsOn > 0.01;
    // God's light is not shown in the night sky of the Cosmic Heavens
    (this.sun.material as THREE.MeshBasicMaterial).opacity *= 1 - starsOn;

    this.fireLight.intensity = this.mix(prev.fire, cur.fire, t) * (1 + Math.sin(this.time * 9) * 0.12 + Math.sin(this.time * 23) * 0.08);

    for (let i = 0; i < decorFlames.length; i++) {
      const k = 1 + Math.sin(this.time * 12 + i * 1.7) * 0.15;
      decorFlames[i].scale.set(0.35 / k, 1.1 * k, 0.35 / k);
    }

    const rise = this.mix(prev.particleRise, cur.particleRise, t);
    const p = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = p.array as Float32Array;
    for (let i = 0; i < this.particleVel.length; i++) {
      arr[i * 3 + 1] += this.particleVel[i] * rise * dt;
      arr[i * 3 + 2] += speed * dt * 0.9;
      arr[i * 3] += Math.sin(this.time + i) * dt * 0.3;
      if (arr[i * 3 + 1] > 12 || arr[i * 3 + 2] > 8) {
        arr[i * 3 + 1] = -1 + Math.random() * 3;
        arr[i * 3 + 2] = -80 + Math.random() * 20;
      }
    }
    p.needsUpdate = true;

    if (map.gateZ !== null) this.gate.update(map.gateZ - distance, rel(map.gateZ), this.time);
    else this.gate.update(1e6, 0, this.time);
  }

  private mix(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private col(target: THREE.Color, a: string, b: string, t: number): void {
    this.c1.set(a);
    this.c2.set(b);
    target.copy(this.c1).lerp(this.c2, t);
  }

  private applyLook(a: ThemeLook, b: ThemeLook, t: number): void {
    this.col(this.bg, a.sky, b.sky, t);
    this.col(this.fog.color, a.fog, b.fog, t);
    this.fog.near = this.mix(a.fogNear, b.fogNear, t);
    this.fog.far = this.mix(a.fogFar, b.fogFar, t);
    this.col(this.hemi.color, a.hemiSky, b.hemiSky, t);
    this.col(this.hemi.groundColor, a.hemiGround, b.hemiGround, t);
    this.hemi.intensity = this.mix(a.hemi, b.hemi, t);
    this.col(this.key.color, a.key, b.key, t);
    this.key.intensity = this.mix(a.keyIntensity, b.keyIntensity, t);
    this.col(this.particleMat.color, a.particle, b.particle, t);
    this.particleMat.size = this.mix(a.particleSize, b.particleSize, t);
    this.exposure = this.mix(a.exposure, b.exposure, t);
  }
}
