import { CONFIG, laneX } from '../core/config';

/**
 * low  = fiery barrier you must JUMP over
 * high = burning beam you must SLIDE under
 * wall = solid rock you must go AROUND (change lane)
 * lava = lava pit you must JUMP across (falling in ends the run)
 */
export type ObstacleKind = 'low' | 'high' | 'wall' | 'lava';

export interface ObstacleShape {
  width: number;
  length: number;
  bottom: number;
  top: number;
}

export const SHAPES: Record<ObstacleKind, ObstacleShape> = {
  low: { width: 1.9, length: 0.6, bottom: 0, top: 0.8 },
  high: { width: 1.9, length: 0.6, bottom: 1.25, top: 3.2 },
  wall: { width: 1.9, length: 1.8, bottom: 0, top: 3.4 },
  lava: { width: 2.0, length: 3.2, bottom: -1, top: 0.12 },
};

export interface ObstacleData {
  id: number;
  kind: ObstacleKind;
  lane: number;
  z: number; // distance along the track (centre)
  hit: boolean;
}

export interface PlayerBox {
  x: number;
  y: number; // feet height
  z: number; // distance along the track
  height: number;
}

/** Does the player's box overlap this obstacle's box? */
export function overlaps(p: PlayerBox, o: ObstacleData): boolean {
  const s = SHAPES[o.kind];
  const pw = CONFIG.player.width / 2;
  const pd = CONFIG.player.depth / 2;
  if (Math.abs(p.x - laneX(o.lane)) >= pw + s.width / 2) return false;
  if (Math.abs(p.z - o.z) >= pd + s.length / 2) return false;
  return p.y < s.top && p.y + p.height > s.bottom;
}

export type HitResult = 'none' | 'stumble' | 'scrape' | 'crash' | 'fall';

/**
 * What happens when the player touches an obstacle.
 * - low/high barriers: you stumble through them (the Devil gains on you)
 * - wall from the side while changing lanes: you bounce back and stumble
 * - wall head-on: crash, the Devil gets you
 * - lava: you fall in
 */
export function resolveHit(o: ObstacleData, changingLaneInto: boolean): HitResult {
  switch (o.kind) {
    case 'low':
    case 'high':
      return 'stumble';
    case 'wall':
      return changingLaneInto ? 'scrape' : 'crash';
    case 'lava':
      return 'fall';
  }
}
