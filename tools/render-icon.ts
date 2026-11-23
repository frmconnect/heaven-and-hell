/** Renders the app icon concept: a runner sprinting into Heaven's open gates. Used by scripts/render-icon.cjs. */
import * as THREE from 'three';
import { GateSet } from '../src/world/GateSet';
import { PlayerAvatar } from '../src/player/PlayerAvatar';
import { PlayerMotion } from '../src/player/PlayerMotion';
import { DECOR, buildTile } from '../src/world/decor';

export function renderIcon(size: number, cam: { x: number; y: number; z: number; lx: number; ly: number; lz: number; fov: number }, runnerZ: number, gateScale = 1): string {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setSize(size, size);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  // sky: deep blue at the top fading to warm gold light at the gates
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#3a4fa8');
  grad.addColorStop(0.45, '#9bb4f0');
  grad.addColorStop(0.75, '#ffe7b0');
  grad.addColorStop(1, '#fff6dc');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const sky = new THREE.CanvasTexture(c);
  sky.colorSpace = THREE.SRGBColorSpace;
  scene.background = sky;
  scene.fog = new THREE.Fog('#fff2d0', 30, 90);
  scene.add(new THREE.HemisphereLight('#fff8e8', '#b0a080', 1.6));
  const key = new THREE.DirectionalLight('#fff0d0', 1.4);
  key.position.set(-6, 12, -30); // light coming from beyond the gates
  scene.add(key);
  const rim = new THREE.PointLight('#ffe6a0', 60, 40, 1.2);
  rim.position.set(0, 4, -18);
  scene.add(rim);

  // the gates, fully open, light pouring through
  const gate = new GateSet(scene);
  gate.update(20, 0, 1.2); // gate 20 m ahead of the origin, doors open
  gate.root.scale.setScalar(gateScale);
  // the soft light-beam cone reads as a hard triangle in a still picture: hide it
  gate.root.traverse((o) => {
    const mat = (o as THREE.Mesh).material as THREE.Material | undefined;
    if (mat && (mat as THREE.MeshBasicMaterial).blending === THREE.AdditiveBlending) o.visible = false;
  });
  // heavenly light bursting through the open gates
  const gc = document.createElement('canvas');
  gc.width = gc.height = 128;
  const gg = gc.getContext('2d')!;
  const rg = gg.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0, 'rgba(255,255,255,1)');
  rg.addColorStop(0.3, 'rgba(255,246,214,0.95)');
  rg.addColorStop(0.65, 'rgba(255,220,140,0.35)');
  rg.addColorStop(1, 'rgba(255,210,120,0)');
  gg.fillStyle = rg;
  gg.fillRect(0, 0, 128, 128);
  const glowTex = new THREE.CanvasTexture(gc);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  const burst = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, fog: false }));
  burst.scale.set(16 * gateScale * 1.6, 22 * gateScale * 1.6, 1);
  burst.position.set(0, 10 * gateScale, -21.5);
  scene.add(burst);
  // a few rays fanning out from the light
  for (const [ang, w] of [[-0.5, 0.9], [-0.22, 0.7], [0.12, 0.8], [0.42, 0.7], [0.68, 0.6]] as const) {
    const ray = new THREE.Mesh(new THREE.PlaneGeometry(w, 40), new THREE.MeshBasicMaterial({ color: '#fff4d0', transparent: true, opacity: 0.18, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    ray.position.set(0, 10 * gateScale, -22);
    ray.rotation.z = ang;
    ray.translateY(14);
    scene.add(ray);
  }
  // the marble path leading to them
  for (let i = -1; i < 4; i++) {
    const t = buildTile('gate').obj;
    t.position.set(0, 0, -(i * 10 + 5));
    scene.add(t);
  }
  // clouds around the base
  const cloudSpec = DECOR.gate[0];
  for (const [x, y, z, s] of [[-12, -1, -22, 2.6], [12, -1.5, -21, 2.8], [-8, -2, -12, 2], [9, -2, -10, 2.2], [-15, 0, -30, 3], [15, 0.5, -30, 3]] as const) {
    const cl = cloudSpec.build();
    cl.position.set(x, y, z);
    cl.scale.setScalar(s);
    scene.add(cl);
  }
  // the runner, mid-stride, running away from us into the light
  const p = new PlayerAvatar(scene);
  const m = new PlayerMotion();
  for (let i = 0; i < 9; i++) p.update(1 / 60, m, 14, null);
  p.root.position.set(0, 0, runnerZ);

  const camera = new THREE.PerspectiveCamera(cam.fov, 1, 0.1, 400);
  camera.position.set(cam.x, cam.y, cam.z);
  camera.lookAt(cam.lx, cam.ly, cam.lz);
  r.render(scene, camera);
  return r.domElement.toDataURL('image/png').split(',')[1];
}
