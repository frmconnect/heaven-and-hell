import * as THREE from 'three';

const N = 70;

/**
 * Trail behind the runner (shop cosmetic): glowing particles left where you ran,
 * which stream back towards the camera as the world scrolls past.
 */
export class TrailRenderer {
  private points: THREE.Points;
  private mat: THREE.PointsMaterial;
  private pos = new Float32Array(N * 3);
  private col = new Float32Array(N * 3);
  private age = new Float32Array(N).fill(99);
  private next = 0;
  private emit = 0;
  private kind = 'none-trail';
  private c1 = new THREE.Color();
  private c2 = new THREE.Color();

  constructor(scene: THREE.Scene) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    // soft round glow instead of square dots
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g2 = c.getContext('2d');
    if (g2) {
      const grad = g2.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g2.fillStyle = grad;
      g2.fillRect(0, 0, 32, 32);
    }
    this.mat = new THREE.PointsMaterial({ map: new THREE.CanvasTexture(c), size: 0.35, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
    scene.add(this.points);
  }

  setTrail(kind: string, look: { primary: string; secondary?: string }): void {
    this.kind = kind;
    this.points.visible = kind !== 'none-trail';
    if (!this.points.visible) return;
    this.c1.set(look.primary);
    this.c2.set(look.secondary ?? look.primary);
    this.mat.size = kind === 'stardust' ? 0.3 : kind === 'goldtrail' ? 0.45 : 0.38;
    this.age.fill(99);
  }

  /** x, y = where the runner is; speed moves old particles back towards the camera. */
  update(dt: number, x: number, y: number, speed: number, running: boolean): void {
    if (!this.points.visible) return;
    if (running) {
      this.emit += dt * 45;
      while (this.emit >= 1) {
        this.emit -= 1;
        const i = this.next;
        this.next = (this.next + 1) % N;
        this.age[i] = 0;
        const spread = this.kind === 'stardust' ? 0.5 : this.kind === 'embers' ? 0.35 : 0.15;
        this.pos[i * 3] = x + (Math.random() - 0.5) * spread;
        this.pos[i * 3 + 1] = y + 0.6 + Math.random() * (this.kind === 'goldtrail' ? 0.2 : 0.8);
        this.pos[i * 3 + 2] = 0.3;
        const c = Math.random() < 0.5 ? this.c1 : this.c2;
        this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
      }
    }
    for (let i = 0; i < N; i++) {
      this.age[i] += dt;
      const a = this.age[i];
      if (a > 1.2) {
        this.pos[i * 3 + 1] = -100;
        continue;
      }
      this.pos[i * 3 + 2] += speed * dt;
      if (this.kind === 'embers') this.pos[i * 3 + 1] += dt * 0.8;
      if (this.kind === 'goldtrail') this.pos[i * 3 + 1] = Math.max(0.05, this.pos[i * 3 + 1] - dt * 0.8);
      // fade out by darkening (additive blending)
      const f = Math.max(0, 1 - a / 1.2);
      this.col[i * 3] *= 0.985 + 0.015 * f;
      this.col[i * 3 + 1] *= 0.985 + 0.015 * f;
      this.col[i * 3 + 2] *= 0.985 + 0.015 * f;
    }
    this.points.geometry.getAttribute('position').needsUpdate = true;
    this.points.geometry.getAttribute('color').needsUpdate = true;
  }
}
