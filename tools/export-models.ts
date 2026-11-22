/**
 * Exports every 3D model in the game as .glb files (opens in Blender: File > Import > glTF 2.0).
 * Run by scripts/export-models.cjs in a browser through the Vite dev server. Not part of the game.
 */
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { PlayerAvatar } from '../src/player/PlayerAvatar';
import { DevilAvatar } from '../src/enemies/DevilAvatar';
import { ShadowAvatar } from '../src/enemies/ShadowAvatar';
import { GateSet } from '../src/world/GateSet';
import { ObstacleRenderer } from '../src/world/ObstacleRenderer';
import { PickupRenderer } from '../src/world/PickupRenderer';
import { DECOR, buildTile } from '../src/world/decor';
import { SHOP_ITEMS } from '../src/systems/Shop';
import type { ThemeId } from '../src/world/journey';

const exporter = new GLTFExporter();

/** Names for the roadside scenery, in the same order as DECOR in src/world/decor.ts. */
const SCENERY_NAMES: Partial<Record<ThemeId, string[]>> = {
  hell: ['rock-spire', 'rock-spire-far', 'fire-brazier'],
  stairway: ['gold-column', 'angel-statue', 'cloud'],
  gate: ['cloud', 'gold-column'],
  gardens: ['tree', 'flower-bush', 'fountain', 'tree-far'],
  bridges: ['crystal-lamp', 'floating-island', 'cloud'],
  kingdom: ['gold-column', 'golden-tower', 'temple'],
  cosmic: ['star-lamp', 'crystal-spire', 'planet'],
  god: ['golden-cloud', 'gold-column'],
};

async function toBase64(obj: THREE.Object3D): Promise<string> {
  obj.updateMatrixWorld(true);
  const buf = (await exporter.parseAsync(obj, { binary: true, onlyVisible: true })) as ArrayBuffer;
  let s = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** A fresh copy of an object at the origin, so the file opens centred. */
function atOrigin(obj: THREE.Object3D, name: string): THREE.Object3D {
  obj.position.set(0, 0, 0);
  obj.rotation.set(0, 0, 0);
  obj.name = name;
  return obj;
}

export async function exportAll(): Promise<Record<string, string>> {
  const scene = new THREE.Scene();
  const out: Record<string, string> = {};
  const add = async (path: string, obj: THREE.Object3D) => {
    out[path] = await toBase64(obj);
  };

  // the runner in each outfit, and each set of wings on the runner
  for (const o of SHOP_ITEMS.filter((i) => i.category === 'outfit')) {
    const p = new PlayerAvatar(scene);
    p.setOutfit(o.look);
    await add(`characters/runner-${o.id}.glb`, atOrigin(p.root, `Runner (${o.name})`));
  }
  for (const w of SHOP_ITEMS.filter((i) => i.category === 'wings' && i.id !== 'none')) {
    const p = new PlayerAvatar(scene);
    p.setWings(w.id, w.look);
    await add(`wings/runner-with-${w.id}.glb`, atOrigin(p.root, `Runner with ${w.name}`));
  }

  const devil = new DevilAvatar(scene);
  await add('characters/devil.glb', atOrigin(devil.root, 'The Devil'));

  const shadow = new ShadowAvatar(scene);
  shadow.update(3, true, 4, 0, false, () => 0); // fade fully in
  shadow.root.visible = true;
  await add('characters/shadow-of-sins.glb', atOrigin(shadow.root, 'Shadow of your sins'));

  const gate = new GateSet(scene);
  gate.update(200, 0, 0); // doors closed
  gate.root.visible = true;
  await add('world/heavens-gate.glb', atOrigin(gate.root, "Heaven's Gate"));

  // obstacles, one file per kind and world
  const obs = new ObstacleRenderer(scene) as unknown as { build(kind: string, theme: ThemeId): THREE.Object3D };
  const kindName: Record<string, string> = { low: 'jump-barrier', high: 'slide-beam', wall: 'wall', pit: 'gap' };
  for (const theme of ['hell', 'stairway', 'gardens', 'bridges', 'kingdom', 'cosmic'] as ThemeId[]) {
    for (const kind of ['low', 'high', 'wall', 'pit']) {
      await add(`obstacles/${theme}/${kindName[kind]}.glb`, atOrigin(obs.build(kind, theme), `${theme} ${kindName[kind]}`));
    }
  }

  // track floor pieces and roadside scenery for each world
  for (const theme of Object.keys(DECOR) as ThemeId[]) {
    await add(`track/${theme}-floor-10m.glb`, atOrigin(buildTile(theme).obj, `${theme} floor (10 m)`));
    const names = SCENERY_NAMES[theme] ?? [];
    let i = 0;
    for (const spec of DECOR[theme]) {
      const n = names[i] ?? `item-${i + 1}`;
      i++;
      await add(`scenery/${theme}/${n}.glb`, atOrigin(spec.build(), `${theme} ${n}`));
    }
  }

  // pickups
  const pick = new PickupRenderer(scene) as unknown as { build(kind: string): THREE.Object3D };
  await add('pickups/lost-soul.glb', atOrigin(pick.build('soul'), 'Lost soul'));
  await add('pickups/temptation-cursed-gold.glb', atOrigin(pick.build('temptation'), 'Temptation (cursed gold)'));
  await add('pickups/miracle-shield.glb', atOrigin(pick.build('miracle'), 'Miracle Shield'));
  const coinGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.08, 14);
  coinGeo.rotateX(Math.PI / 2);
  const coin = new THREE.Mesh(coinGeo, new THREE.MeshStandardMaterial({ color: '#ffcc33', metalness: 0.8, roughness: 0.25, emissive: '#b07000', emissiveIntensity: 0.6 }));
  coin.position.y = 1;
  const coinGroup = new THREE.Group();
  coinGroup.add(coin);
  await add('pickups/coin.glb', atOrigin(coinGroup, 'Coin'));
  return out;
}
