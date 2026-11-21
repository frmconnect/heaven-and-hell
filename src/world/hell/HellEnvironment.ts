import * as THREE from 'three';
import { CONFIG } from '../../core/config';
import { Rng } from '../../core/rng';
import { basaltTexture, lavaTexture, rockTexture } from './textures';

const TRACK_WIDTH = CONFIG.lanes.width * CONFIG.lanes.count + 0.8;
const TILE = CONFIG.track.tileLength;
const TILE_COUNT = Math.ceil((CONFIG.track.viewAhead + 30) / TILE);
const SPIRE_SPAN = 200;

/**
 * Everything that makes the run look like Hell: the stone path, lava seas on both sides,
 * rock spires, braziers, a distant volcano, drifting embers, red fog and fiery light.
 * The player stays at z = 0 and the world scrolls towards them.
 */
export class HellEnvironment {
  readonly group = new THREE.Group();
  private tiles: THREE.Mesh[] = [];
  private lavaTex: THREE.CanvasTexture;
  private lavaMat: THREE.MeshBasicMaterial;
  private spires: { obj: THREE.Object3D; z: number }[] = [];
  private flames: THREE.Mesh[] = [];
  private embers: THREE.Points;
  private emberVel: Float32Array;
  private fireLight: THREE.PointLight;
  private time = 0;

  constructor(scene: THREE.Scene) {
    scene.background = new THREE.Color('#1a0503');
    scene.fog = new THREE.Fog('#2a0804', 28, 150);
    scene.add(this.group);

    // light: dim red sky, orange glow from the lava below, warm key light
    this.group.add(new THREE.HemisphereLight('#ff7a4a', '#5a0a00', 1.1));
    const key = new THREE.DirectionalLight('#ffb27a', 1.4);
    key.position.set(-4, 10, 6);
    this.group.add(key);
    this.fireLight = new THREE.PointLight('#ff5a1a', 30, 18, 1.6);
    this.fireLight.position.set(0, 3, -2);
    this.group.add(this.fireLight);

    // the stone path, made of recycled tiles
    const floorTex = basaltTexture();
    floorTex.repeat.set(1.5, 2);
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95, metalness: 0, emissive: '#ff3300', emissiveMap: floorTex, emissiveIntensity: 0.35 });
    const floorGeo = new THREE.BoxGeometry(TRACK_WIDTH, 0.8, TILE);
    for (let i = 0; i < TILE_COUNT; i++) {
      const m = new THREE.Mesh(floorGeo, floorMat);
      m.position.y = -0.4;
      this.tiles.push(m);
      this.group.add(m);
    }
    // glowing edges of the path
    const edgeMat = new THREE.MeshBasicMaterial({ color: '#ff6a1a' });
    for (const side of [-1, 1]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 400), edgeMat);
      edge.position.set(side * (TRACK_WIDTH / 2), 0.02, -180);
      this.group.add(edge);
    }

    // lava sea on both sides (one big plane under the path)
    this.lavaTex = lavaTexture();
    this.lavaTex.repeat.set(12, 30);
    this.lavaMat = new THREE.MeshBasicMaterial({ map: this.lavaTex, color: '#ffffff' });
    const lava = new THREE.Mesh(new THREE.PlaneGeometry(240, 400), this.lavaMat);
    lava.rotation.x = -Math.PI / 2;
    lava.position.set(0, -1.1, -170);
    this.group.add(lava);

    // rock spires and braziers along the sides
    const r = new Rng(99);
    const rockMat = new THREE.MeshStandardMaterial({ map: rockTexture(), roughness: 1, color: '#7a4a40', flatShading: true });
    const spireGeo = new THREE.ConeGeometry(1, 1, 5);
    const flameGeo = new THREE.ConeGeometry(0.35, 1.1, 5);
    const flameMat = new THREE.MeshBasicMaterial({ color: '#ffb02a', transparent: true, opacity: 0.9 });
    const bowlGeo = new THREE.CylinderGeometry(0.45, 0.25, 0.4, 6);
    const postGeo = new THREE.CylinderGeometry(0.12, 0.16, 1.6, 5);
    const ironMat = new THREE.MeshStandardMaterial({ color: '#2a1a18', roughness: 0.6, metalness: 0.6 });
    for (let i = 0; i < 46; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = (i / 46) * SPIRE_SPAN;
      let obj: THREE.Object3D;
      if (i % 5 === 0) {
        // brazier right next to the path
        const g = new THREE.Group();
        const post = new THREE.Mesh(postGeo, ironMat);
        post.position.y = 0.8;
        const bowl = new THREE.Mesh(bowlGeo, ironMat);
        bowl.position.y = 1.7;
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.y = 2.3;
        this.flames.push(flame);
        g.add(post, bowl, flame);
        g.position.x = side * (TRACK_WIDTH / 2 + 0.6);
        obj = g;
      } else {
        const m = new THREE.Mesh(spireGeo, rockMat);
        const h = r.range(4, 16);
        m.scale.set(r.range(1, 2.6), h, r.range(1, 2.6));
        m.rotation.y = r.range(0, 3);
        m.position.set(side * r.range(TRACK_WIDTH / 2 + 3, 30), h / 2 - 1.2, 0);
        obj = m;
      }
      this.spires.push({ obj, z });
      this.group.add(obj);
    }

    // distant volcano (ignores fog so it reads as a silhouette)
    const volcano = new THREE.Mesh(
      new THREE.ConeGeometry(70, 60, 7, 1, true),
      new THREE.MeshBasicMaterial({ color: '#120202', fog: false }),
    );
    volcano.position.set(30, 10, -320);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(14, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff4a0a', fog: false, transparent: true, opacity: 0.7 }));
    glow.position.set(30, 40, -322);
    glow.scale.y = 0.5;
    this.group.add(volcano, glow);

    // embers rising from the lava
    const n = 260;
    const pos = new Float32Array(n * 3);
    this.emberVel = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = r.range(-25, 25);
      pos[i * 3 + 1] = r.range(-1, 12);
      pos[i * 3 + 2] = r.range(-80, 8);
      this.emberVel[i] = r.range(0.6, 2);
    }
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.embers = new THREE.Points(eg, new THREE.PointsMaterial({ color: '#ffa040', size: 0.14, transparent: true, opacity: 0.85, depthWrite: false }));
    this.group.add(this.embers);
  }

  update(dt: number, distance: number, speed: number): void {
    this.time += dt;
    // floor tiles: place each so it covers the stretch just behind to far ahead
    const first = Math.floor((distance - 20) / TILE);
    this.tiles.forEach((t, i) => {
      const k = first + i;
      t.position.z = -(k * TILE + TILE / 2 - distance);
    });
    // lava flows and glows
    this.lavaTex.offset.y = (distance * 30) / 400 + this.time * 0.02; // scrolls with the run
    this.lavaTex.offset.x = Math.sin(this.time * 0.3) * 0.05;
    const pulse = 0.85 + Math.sin(this.time * 2.1) * 0.08 + Math.sin(this.time * 5.3) * 0.04;
    this.lavaMat.color.setScalar(pulse);
    this.fireLight.intensity = 28 + Math.sin(this.time * 9) * 4 + Math.sin(this.time * 23) * 3;

    for (const s of this.spires) {
      let rel = (s.z - distance) % SPIRE_SPAN;
      if (rel < -20) rel += SPIRE_SPAN;
      s.obj.position.z = -rel;
    }
    for (let i = 0; i < this.flames.length; i++) {
      const f = this.flames[i];
      const k = 1 + Math.sin(this.time * 12 + i * 1.7) * 0.15;
      f.scale.set(1 / k, k, 1 / k);
    }
    const p = this.embers.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = p.array as Float32Array;
    for (let i = 0; i < this.emberVel.length; i++) {
      arr[i * 3 + 1] += this.emberVel[i] * dt;
      arr[i * 3 + 2] += speed * dt * 0.9;
      arr[i * 3] += Math.sin(this.time + i) * dt * 0.3;
      if (arr[i * 3 + 1] > 12 || arr[i * 3 + 2] > 8) {
        arr[i * 3 + 1] = -1;
        arr[i * 3 + 2] = -80 + Math.random() * 20;
      }
    }
    p.needsUpdate = true;
  }
}
