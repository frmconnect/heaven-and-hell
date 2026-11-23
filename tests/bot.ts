import { CONFIG } from '../src/core/config';
import type { RunSession } from '../src/core/RunSession';
import { lengthOf } from '../src/world/obstacles';

/** A simple robot player: looks at the next row, moves to a lane without a wall, then jumps or slides.
 *  style 'saint' goes for souls, 'sinner' goes for temptations, 'none' ignores both. */
export function botStep(s: RunSession, style: 'none' | 'saint' | 'sinner' = 'none'): void {
  const d = s.distance;
  // a saint avoids cursed gold: move away if there's room, otherwise jump over it
  if (style === 'saint') {
    const gold = s.pickups.find((p) => !p.resolved && p.kind === 'temptation' && p.lane === s.motion.lane && p.z - d > 0 && p.z - d < 12);
    if (gold) {
      const wallAt = (lane: number) => s.obstacles.some((o) => o.lane === lane && Math.abs(o.z - gold.z) < lengthOf(o) / 2 + 2 && (o.kind === 'wall' || lengthOf(o) > 6));
      const side = [s.motion.lane - 1, s.motion.lane + 1].find((l) => l >= 0 && l <= 2 && !wallAt(l));
      if (side !== undefined && gold.z - d > 5) {
        s.act(side < s.motion.lane ? 'left' : 'right');
        return;
      }
      if (gold.z - d < s.speed * 0.18 + 0.4) s.act('jump');
    }
  }
  if (style !== 'none') {
    const want = style === 'saint' ? 'soul' : 'temptation';
    const firstRow = Math.min(...s.obstacles.filter((o) => o.z + lengthOf(o) / 2 > d).map((o) => o.z - lengthOf(o) / 2), Infinity);
    const target = s.pickups.find((p) => !p.resolved && p.kind === want && p.z > d && p.z < firstRow && p.z - d < 30);
    if (target) {
      if (target.lane < s.motion.lane) s.act('left');
      else if (target.lane > s.motion.lane) s.act('right');
      return;
    }
  }
  const ahead = s.obstacles.filter((o) => o.z + lengthOf(o) / 2 > d - 0.5).sort((a, b) => a.z - lengthOf(a) / 2 - (b.z - lengthOf(b) / 2));
  if (!ahead.length) return;
  const rowZ = ahead[0].z;
  const row = ahead.filter((o) => o.z === rowZ);
  const obIn = (lane: number) => row.find((o) => o.lane === lane);
  const m = s.motion;
  const blocked = (lane: number) => {
    const o = obIn(lane);
    return !!o && (o.kind === 'wall' || lengthOf(o) > 6);
  };
  const score = (lane: number) => (blocked(lane) ? 100 : obIn(lane) ? 1 : 0) + Math.abs(lane - m.lane) * 0.5;
  const best = [0, 1, 2].sort((a, b) => score(a) - score(b))[0];
  if (best < m.lane) s.act('left');
  else if (best > m.lane) s.act('right');
  const o = obIn(m.lane);
  if (!o || m.changingLane) return;
  const near = rowZ - lengthOf(o) / 2 - CONFIG.player.depth / 2 - d;
  if ((o.kind === 'low' || o.kind === 'pit') && near < s.speed * 0.2 && near > 0) s.act('jump');
  if (o.kind === 'high' && near < s.speed * 0.25 && near > 0 && !m.sliding) s.act('slide');
}
