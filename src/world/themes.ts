import type { ThemeId } from './journey';

/** Sky, fog, light and particle settings for each world. Blended smoothly when you cross into a new stage. */
export interface ThemeLook {
  sky: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  hemiSky: string;
  hemiGround: string;
  hemi: number;
  key: string;
  keyIntensity: number;
  fire: number; // intensity of the flickering fire light near the player
  particle: string;
  particleRise: number;
  particleSize: number;
  exposure: number;
  stars?: number; // 0..1 starfield (Cosmic Heavens)
}

export const LOOKS: Record<ThemeId, ThemeLook> = {
  hell: {
    sky: '#1a0503', fog: '#2a0804', fogNear: 28, fogFar: 150,
    hemiSky: '#ff7a4a', hemiGround: '#5a0a00', hemi: 1.1, key: '#ffb27a', keyIntensity: 1.4,
    fire: 30, particle: '#ffa040', particleRise: 1.3, particleSize: 0.14, exposure: 1,
  },
  stairway: {
    sky: '#9fb8dc', fog: '#c9d6ea', fogNear: 35, fogFar: 190,
    hemiSky: '#fff4e0', hemiGround: '#8a7a9a', hemi: 1.4, key: '#fff0d0', keyIntensity: 1.8,
    fire: 0, particle: '#ffffff', particleRise: 0.5, particleSize: 0.1, exposure: 0.95,
  },
  gate: {
    sky: '#c8d6f4', fog: '#dfe4f6', fogNear: 30, fogFar: 170,
    hemiSky: '#fff8ec', hemiGround: '#a89870', hemi: 1.15, key: '#fff4d8', keyIntensity: 1.3,
    fire: 0, particle: '#fff2b0', particleRise: 0.4, particleSize: 0.12, exposure: 0.85,
  },
  gardens: {
    sky: '#a8d8f8', fog: '#d6ecfa', fogNear: 35, fogFar: 180,
    hemiSky: '#fffbe8', hemiGround: '#6a9a50', hemi: 1.4, key: '#fff4dc', keyIntensity: 1.9,
    fire: 0, particle: '#ffc8e6', particleRise: 0.3, particleSize: 0.12, exposure: 0.95,
  },
  bridges: {
    sky: '#6f86d8', fog: '#b4c2f0', fogNear: 35, fogFar: 200,
    hemiSky: '#eef0ff', hemiGround: '#5a5aa0', hemi: 1.4, key: '#f0f0ff', keyIntensity: 1.7,
    fire: 0, particle: '#d8e8ff', particleRise: 0.6, particleSize: 0.1, exposure: 0.95,
  },
  god: {
    sky: '#fff6e0', fog: '#fffaf0', fogNear: 10, fogFar: 90,
    hemiSky: '#ffffff', hemiGround: '#f0d8a0', hemi: 1.6, key: '#fff8e8', keyIntensity: 1.6,
    fire: 0, particle: '#fff8d0', particleRise: 1.2, particleSize: 0.16, exposure: 1.05,
  },
  cosmic: {
    sky: '#0c0828', fog: '#1a1040', fogNear: 40, fogFar: 210,
    hemiSky: '#b8a8ff', hemiGround: '#301a60', hemi: 1.3, key: '#d8e8ff', keyIntensity: 1.5,
    fire: 0, particle: '#9fe8ff', particleRise: 0.4, particleSize: 0.12, exposure: 1.05, stars: 1,
  },
  kingdom: {
    sky: '#f2c86a', fog: '#f7deaa', fogNear: 30, fogFar: 170,
    hemiSky: '#fff2c8', hemiGround: '#a07830', hemi: 1.5, key: '#ffe6a8', keyIntensity: 2,
    fire: 0, particle: '#ffe48a', particleRise: 0.6, particleSize: 0.13, exposure: 0.95,
  },
};
