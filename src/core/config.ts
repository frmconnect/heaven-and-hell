/**
 * All tunable game numbers live here so balancing is easy.
 * Distances are in metres (1 unit = 1 m), times in seconds.
 */
export const CONFIG = {
  lanes: {
    count: 3,
    width: 2.2, // distance between lane centres
    switchSpeed: 14, // how fast the player slides sideways (m/s)
  },
  run: {
    startSpeed: 11, // forward speed at the start of a run
    maxSpeed: 26,
    speedGainPerMetre: 0.0045, // speed added for every metre run
    stumbleSlowdown: 0.6, // speed multiplier right after a stumble
    stumbleRecoverTime: 1.2, // seconds to get back to full speed
  },
  jump: {
    velocity: 9.5, // upward speed when jumping
    gravity: 28,
    fastFallGravity: 80, // swipe down mid-air drops you quickly
  },
  slide: {
    duration: 0.75,
  },
  player: {
    width: 0.8,
    height: 1.8,
    slideHeight: 0.8,
    depth: 0.6,
  },
  devil: {
    // 3 stumbles close together = caught (Decisions log #15): 14 → 9 → 4 → caught
    startGap: 6, // how far behind the chaser starts (metres)
    maxGap: 14, // the chaser never falls further back than this
    recoverPerSecond: 1.6, // gap regained per second of clean running
    stumblePenalty: 5, // gap lost on each stumble
    catchGap: 0, // gap at which the Devil catches you
  },
  track: {
    viewAhead: 140, // how far ahead obstacles are spawned
    cleanupBehind: 12, // remove things this far behind the player
    safeStart: 40, // first obstacle-free stretch
    minRowGapSeconds: 0.85, // min time between obstacle rows at current speed
    maxRowGapSeconds: 1.6,
    minRowGapMetres: 11,
    tileLength: 10, // length of one floor tile
  },
  coins: {
    spacing: 2.2,
    pickupRadius: 1.0,
    points: 10,
  },
  score: {
    pointsPerMetre: 1,
  },
  // Phase 3: souls, temptations, Miracles and judgment (Decisions log #16-19)
  moral: {
    encounterEvery: [260, 380], // metres between a soul or a temptation
    temptationChance: 0.5, // otherwise a lost soul
    temptationCoins: 25, // coins in a pile of cursed gold
    miracleEvery: [1300, 1900], // metres between Miracle Shields
    pickupRadius: 1.3,
    shieldInvulnerable: 1.0, // seconds of safety after the shield breaks
  },
  // Phase 4: Ascended State (Decisions log #20-23)
  ascended: {
    startSpeed: 15,
    maxSpeed: 32,
    multiplierEvery: 250, // clean metres per multiplier step
    maxMultiplier: 5,
  },
  ability: {
    // owner play-test: charging was too fast — now about once every 30 seconds of good running
    chargePerCoin: 0.01, // 100 coins fill the button
    chargePerMetre: 0.0004, // clean running alone fills it in 2,500 m
    flightHeight: 3.4,
    slowMotionScale: 0.5,
    magnetRange: 10,
  },
  judgment: {
    pass: 70, // Grace % needed to pass
    extra: 85, // extra reward
    perfect: 100,
    rewardCoins: { pass: 500, extra: 1000, perfect: 2000 },
  },
  camera: {
    height: 4.6,
    distance: 7.2,
    lookAhead: 6,
    horizontalFovDeg: 62, // keeps all lanes visible on narrow phones
    minVerticalFovDeg: 55,
  },
  maxDeltaTime: 1 / 20, // stops huge jumps if the phone lags
  maxPixelRatio: 2,
} as const;

export const laneX = (lane: number): number => (lane - (CONFIG.lanes.count - 1) / 2) * CONFIG.lanes.width;
