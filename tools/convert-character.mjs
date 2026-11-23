/**
 * Converts a Quaternius animated character (FBX) into a small .glb for the game.
 * Usage: node tools/convert-character.mjs <input.fbx> <output.glb>
 * Keeps the mesh, skeleton and the animations the game uses; colours come from a palette
 * painted in the game (src/player/CharacterModel.ts), so no texture is stored.
 */
import fs from 'fs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

globalThis.self = globalThis;
// GLTFExporter (binary) needs FileReader, which Node doesn't have
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then((b) => { this.result = b; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then((b) => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(b).toString('base64'); this.onloadend?.(); }); }
};

const [input, output] = process.argv.slice(2);
const KEEP = { Run: 'run', Jump: 'jump', Punch: 'lunge' };
// finger and tip bones barely move on a phone screen: drop their tracks to keep the file small
const TINY = /(Thumb|Index|Middle|Ring|Pinky|_end|Toe_End|HeadTop)/;

const buf = fs.readFileSync(input);
const loader = new FBXLoader();
loader.manager.setURLModifier(() => 'data:image/png;base64,');
const obj = loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
obj.traverse((o) => {
  if (o.isMesh) o.material = new THREE.MeshStandardMaterial({ name: 'palette' });
});
const clips = [];
for (const c of obj.animations) {
  const short = c.name.split('|').pop();
  if (KEEP[short]) {
    c.name = KEEP[short];
    c.tracks = c.tracks.filter((t) => !TINY.test(t.name) && !t.name.endsWith('.scale'));
    for (const t of c.tracks) t.optimize();
    clips.push(c);
  }
}
const glb = await new GLTFExporter().parseAsync(obj, { binary: true, animations: clips, onlyVisible: false });
fs.writeFileSync(output, Buffer.from(glb));
console.log(`wrote ${output}: ${(glb.byteLength / 1024).toFixed(0)} KB, animations: ${clips.map((c) => c.name).join(', ')}`);
