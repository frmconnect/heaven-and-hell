import { describe, expect, it } from 'vitest';
// Node's file reader (the project doesn't ship Node type definitions)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import fs from 'fs';
import { PALETTE_BANDS, partAtRow } from '../src/player/CharacterModel';

describe('Animated character (Quaternius Animated Man, CC0)', () => {
  it('the colour palette has the five bands of the original texture', () => {
    // from the pack's TextureTutorial.png: skin, eyes, hair, shirt, pants — top to bottom over 32 rows
    expect(PALETTE_BANDS.map((b) => b.part)).toEqual(['skin', 'eyes', 'hair', 'shirt', 'pants']);
    expect([partAtRow(0), partAtRow(8), partAtRow(13), partAtRow(20), partAtRow(31)]).toEqual(['skin', 'eyes', 'hair', 'shirt', 'pants']);
  });

  it('the model file is small and has the animations the game uses', () => {
    const b = fs.readFileSync('public/models/human.glb');
    expect(b.byteLength).toBeLessThan(600 * 1024);
    const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
    expect(json.animations.map((a: { name: string }) => a.name).sort()).toEqual(['jump', 'lunge', 'run']);
    expect(json.skins).toHaveLength(1);
    // low-poly: under 5,000 triangles (Decisions: characters < 5,000)
    let tris = 0;
    for (const m of json.meshes) for (const p of m.primitives) tris += json.accessors[p.indices ?? p.attributes.POSITION].count / 3;
    expect(tris).toBeLessThan(5000);
  });
});
