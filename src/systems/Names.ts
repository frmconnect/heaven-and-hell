import { Rng } from '../core/rng';

/** Generated heavenly names for the leaderboard (Decisions log #30). Nobody can type anything rude. */
export const NAME_WORDS_A = [
  'Radiant', 'Silent', 'Golden', 'Gentle', 'Brave', 'Shining', 'Holy', 'Swift', 'Humble', 'Bright',
  'Faithful', 'Noble', 'Quiet', 'Glorious', 'Wandering', 'Blessed', 'Fearless', 'Peaceful', 'Mighty', 'Celestial',
];
export const NAME_WORDS_B = [
  'Pilgrim', 'Seraph', 'Angel', 'Spirit', 'Wanderer', 'Herald', 'Guardian', 'Soul', 'Dove', 'Flame',
  'Halo', 'Light', 'Runner', 'Cherub', 'Star', 'Psalm', 'Lantern', 'Feather', 'Harp', 'Dawn',
];

/** Same rule as the server: two capitalised words and a number. */
export const NAME_PATTERN = /^[A-Z][a-z]+ [A-Z][a-z]+ [0-9]{1,3}$/;

export function makeName(rng: Rng): string {
  return `${rng.pick(NAME_WORDS_A)} ${rng.pick(NAME_WORDS_B)} ${rng.int(1, 99)}`;
}

/** A handful of different names to choose from. */
export function nameChoices(count: number, seed = Date.now()): string[] {
  const rng = new Rng(seed);
  const out = new Set<string>();
  while (out.size < count) out.add(makeName(rng));
  return [...out];
}
