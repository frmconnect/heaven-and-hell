/** Compress a character .glb for phones: fewer animation keys, packed numbers, meshopt compression.
 * Usage: node tools/compress-glb.mjs <in.glb> <out.glb> */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { resample, prune, dedup, quantize, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import fs from 'fs';

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const [input, output] = process.argv.slice(2);
const before = fs.statSync(input).size;
const doc = await io.read(input);
await doc.transform(resample({ tolerance: 1e-3 }), prune({ keepAttributes: true }), dedup(), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(output, doc);
console.log(`${input}: ${(before / 1024).toFixed(0)} KB -> ${(fs.statSync(output).size / 1024).toFixed(0)} KB`);
