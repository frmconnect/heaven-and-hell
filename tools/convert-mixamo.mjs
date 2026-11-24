/**
 * Converts a Mixamo character + its animations (FBX) into what the game loads:
 *   public/models/<name>/<name>.glb   mesh + skeleton + animations (no textures)
 *   public/models/<name>/*.png         the textures, extracted as-is (shrunk afterwards by tools/shrink-textures.py)
 *   public/models/<name>/materials.json which texture goes in which material slot
 * Usage: node tools/convert-mixamo.mjs <name> <run.fbx (with skin)> jump=<f> slide=<f> stumble=<f> fly=<f>
 */
import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

globalThis.self = globalThis;
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then((b) => { this.result = b; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then((b) => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(b).toString('base64'); this.onloadend?.(); }); }
};
// embedded textures: keep the bytes instead of making browser blob URLs
const blobs = new Map();
globalThis.window = { URL: { createObjectURL: (blob) => { const k = `blob:${blobs.size}`; blobs.set(k, blob); return k; } } };
THREE.TextureLoader.prototype.load = function (url) { const t = new THREE.Texture(); t.userData.url = url; return t; };

const [name, skinFile, ...rest] = process.argv.slice(2);
const anims = Object.fromEntries(rest.map((a) => a.split('=')));
const load = (f) => { const b = fs.readFileSync(f); return new FBXLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), path.dirname(f) + '/'); };

const out = `public/models/${name}`;
fs.mkdirSync(out, { recursive: true });
const obj = load(skinFile);
const slots = {};
let written = 0;
const save = async (tex, label) => {
  const url = tex?.userData?.url;
  if (!url || !blobs.has(url)) return null;
  const file = `${label}.png`;
  fs.writeFileSync(`${out}/${file}`, Buffer.from(await blobs.get(url).arrayBuffer()));
  written++;
  return file;
};
let tris = 0;
const meshes = [];
obj.traverse((o) => { if (o.isMesh) meshes.push(o); });
for (const m of meshes) {
  const g = m.geometry;
  tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
  const mats = Array.isArray(m.material) ? m.material : [m.material];
  for (const mat of mats) {
    if (slots[mat.name]) continue;
    slots[mat.name] = {
      map: await save(mat.map, `${mat.name}_color`),
      normalMap: await save(mat.normalMap, `${mat.name}_normal`),
      emissiveMap: await save(mat.emissiveMap, `${mat.name}_glow`),
      specularMap: await save(mat.specularMap, `${mat.name}_spec`),
    };
  }
  // textures go in separately; export plain named materials
  m.material = Array.isArray(m.material) ? mats.map((x) => new THREE.MeshStandardMaterial({ name: x.name })) : new THREE.MeshStandardMaterial({ name: m.material.name });
}
const clips = [];
const keepRootY = { run: true, slide: true, stumble: true, jump: false, fly: false };
const addClip = (clip, label) => {
  clip.name = label;
  // the game moves the runner: drop sideways/forward root motion (and vertical too for jump/fly)
  clip.tracks = clip.tracks.filter((t) => !/(Thumb|Index|Middle|Ring|Pinky|_End|Eye)/.test(t.name) && !t.name.endsWith('.scale'));
  for (const t of clip.tracks) {
    if (/Hips\.position$/.test(t.name)) {
      const v = t.values;
      const x0 = v[0], y0 = v[1], z0 = v[2];
      for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; if (!keepRootY[label]) v[i + 1] = y0; }
    }
    t.optimize();
  }
  clips.push(clip);
};
addClip(obj.animations[0], 'run');
for (const [label, f] of Object.entries(anims)) addClip(load(f).animations[0], label);
const glb = await new GLTFExporter().parseAsync(obj, { binary: true, animations: clips, onlyVisible: false });
fs.writeFileSync(`${out}/${name}.glb`, Buffer.from(glb));
fs.writeFileSync(`${out}/materials.json`, JSON.stringify(slots, null, 2));
const box = new THREE.Box3().setFromObject(obj);
console.log(`${name}: ${meshes.length} meshes, ${tris} triangles, ${(glb.byteLength / 1024).toFixed(0)} KB glb, ${written} textures, clips: ${clips.map((c) => `${c.name} ${c.duration.toFixed(2)}s`).join(', ')}`);
console.log(JSON.stringify(slots));
