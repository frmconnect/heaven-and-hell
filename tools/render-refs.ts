/** Renders a reference PNG (base64) of each exported .glb. Used by scripts/render-refs.cjs. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export async function renderAll(files: string[]): Promise<Record<string, string>> {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setSize(768, 768);
  r.outputColorSpace = THREE.SRGBColorSpace;
  const out: Record<string, string> = {};
  for (const f of files) {
    const g = await new GLTFLoader().loadAsync('/art/models/' + f);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#c9ced8');
    scene.add(new THREE.HemisphereLight('#ffffff', '#606878', 2.4));
    const d = new THREE.DirectionalLight('#ffffff', 1.6);
    d.position.set(4, 6, -5);
    scene.add(d);
    scene.add(g.scene);
    const box = new THREE.Box3().setFromObject(g.scene);
    const size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 1000);
    const dist = Math.max(size.x, size.y, size.z) * 2.3 + 0.5;
    // three-quarter view from the front (models face -Z)
    cam.position.set(c.x + dist * 0.55, c.y + dist * 0.35, c.z - dist * 0.8);
    cam.lookAt(c);
    r.render(scene, cam);
    out[f] = r.domElement.toDataURL('image/png').split(',')[1];
  }
  return out;
}
