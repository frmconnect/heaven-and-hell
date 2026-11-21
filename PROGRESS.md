# PROGRESS — Heaven & Hell

Play-test link (works now, private to the owner): https://claude.ai/artifact/9bWTMjYKWmHtekqSXBgnHm
GitHub Pages link: _not live yet_ — the repo is private, and GitHub Pages on a private repo needs a paid GitHub plan. See "Open decisions".

## Current phase
Phase 1 — Playable prototype (Hell run). **Built and tested by Claude; waiting for the owner's phone play-test.**

## Completed
- Game design document saved (`GAME_DESIGN.md`), plus `CLAUDE.md` and this file
- Engine decided: Three.js + Vite + TypeScript (web first, Capacitor for app stores later)
- Project setup: Vite + TypeScript + Three.js + Vitest (`npm run dev`, `npm test`, `npm run build`)
- GitHub Actions workflow: runs tests + build on every push; publishes to GitHub Pages on pushes to `main`
- Central game state manager (all 10 states from the design doc; Phase 1 uses MainMenu, HellRun, Paused, GameOver)
- Player auto-runs; 3 lanes; swipe left/right/up/down + arrow keys/WASD/space; mouse drag on desktop
- Jump, slide, and swipe-down-in-the-air to drop fast into a slide
- Endless course generated ahead and removed behind; different random course every run
- Hell obstacles: fire barrier (jump), burning beam (slide), rock wall (change lane), lava pit (jump)
- Collisions and outcomes (see "Technical decisions")
- Speed slowly increases the further you run; obstacle mix gets harder
- Follow camera that keeps all 3 lanes visible on narrow phones
- Hell look: basalt path with glowing cracks, lava seas, rock spires, braziers, volcano, embers, red fog
- Devil chasing behind: closes in when you stumble, drops back with clean running; Devil meter in the HUD, red screen edges when he's close
- Coins (trails + arcs over jumps), score (1 per metre + 10 per coin), distance
- Pause button (and auto-pause when the app goes to the background)
- Game over screen with reason, score, distance, coins, best score, "NEW BEST!"; tap to run again
- Best score, total coins and run count saved on the device
- Friendly error screen instead of a blank page if something breaks

## How it was tested
- 31 unit tests (`npm test`): state machine, lanes, jump/slide, swipe detection (incl. long swipes = one move), collisions, Devil, score, save data
- Robot player test: plays 40 different random courses for 3,000 m each and survives all of them, proving every course is fair
- Played in a headless phone-sized browser (Pixel 7, iPhone 13 sizes): real swipe events, jump, coins, stumble, crash, game over, run again, pause, resume — no errors

## Phase 1 checklist
- [x] Project setup (Vite + TypeScript + Three.js + Vitest)
- [~] GitHub Pages auto-deploy (workflow ready; blocked on private repo — see open decisions)
- [x] Game loop + central game state manager
- [x] Player auto-runs forward
- [x] 3 lanes, swipe left/right (and arrow keys)
- [x] Jump (swipe up) and slide (swipe down)
- [x] Endless track segments generated ahead, recycled behind
- [x] Basic Hell obstacles (low barrier = jump, high barrier = slide, blocker = change lane, lava gap)
- [x] Collision detection
- [x] Follow camera
- [x] Hell look: dark red/orange/black, lava glow, fog, embers
- [x] Devil chasing behind; gets closer on stumbles, falls back with clean running
- [x] Coins + distance/score HUD
- [x] Game over screen + tap to restart
- [ ] Tested on phone by the owner

## Remaining phases
2. Heaven ascension (Stairway, Heaven's Gate, heavenly levels, transitions)
3. Sin, Grace & judgment (temptations, miracles, God encounter, pass/fail)
4. Ascended State (endless mode, abilities, difficulty scaling)
5. Economy & customization (shop, cosmetics, upgrades, save/load)
6. Global competition (accounts, leaderboards, score validation)
7. Polish & release (art, music, performance, Capacitor builds, store release)

## Known bugs / limits
- FIXED: a long swipe from an outer lane jumped two lanes to the far side. Now each swipe moves exactly one lane (found by the owner on their phone).
- No sound yet (planned for later; must be original or licensed)
- Hell is endless for now — the exit to the Stairway comes in Phase 2
- Not yet tested on a real phone (frame rate unknown until the owner tries it)

## Technical decisions
- Web-first with Three.js so Claude can build and test everything end to end and the owner can play each version on a phone. Package with Capacitor for Android/iOS later.
- Game rules (`src/core/RunSession.ts` and friends) are separate from the 3D drawing, so they can be tested by a robot player without a screen.
- All balancing numbers live in `src/core/config.ts`.
- Obstacles are pooled and coins are drawn in one batch, for phone performance.
- **Collision rules (Claude's choice for the prototype — owner can change):**
  - Hitting a fire barrier or burning beam = stumble: you slow down briefly and the Devil gains on you.
  - Two stumbles close together = the Devil catches you.
  - Running head-first into a rock wall = crash, run over.
  - Clipping a wall from the side while changing lanes = bounce back + stumble.
  - Lava pit = you fall in, run over.
- Instant play link: `scripts/make-single-file.mjs` packs the build into one file, published as a private claude.ai page.

## Open design decisions
- **How to publish the play-test link long term:** make the GitHub repo public (free GitHub Pages), upgrade GitHub (paid), or keep using the private claude.ai link. Also needs the work merged into `main`.
- Are the collision rules above right? (e.g. should a wall crash be a stumble instead?)
- Final game name (working title "Heaven & Hell")
- Exactly how runs vary after a failed judgment (see Decisions log in GAME_DESIGN.md)
- Art source for final version (free CC0 models vs. commissioned artist)
