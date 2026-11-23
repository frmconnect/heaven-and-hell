# PROGRESS — Final Freedom

**Play-test link:** https://frmconnect.github.io/heaven-and-hell/ (updates automatically on every push to `main`)
Backup link (private to the owner): https://claude.ai/artifact/9bWTMjYKWmHtekqSXBgnHm

## How to test a later stage quickly
Add `?stage=` to the play link to start right at a stage, e.g.
https://frmconnect.github.io/heaven-and-hell/?stage=gardens (also: stairway, gate, bridges, kingdom).
Ascended State without passing judgment first: https://frmconnect.github.io/heaven-and-hell/?ascended (doesn't change the save).
One-time 10,000 tester coins for the shop: https://frmconnect.github.io/heaven-and-hell/?gift (once per phone).

## Current phase
Phase 1 — **Complete**. Phase 2 — **Complete** (owner play-tested). Phase 3 — **Complete** (owner play-tested). Phase 4 — **Complete** (owner play-tested). Phase 5 — **Complete** (owner play-tested). Phase 6 — **Complete**: online leaderboard live; first real score from the owner's phone confirmed on the server ("Fearless Halo 83", 5,756). Next: Phase 7 — Polish & release (music/settings, sound effects, more shop items, performance, Capacitor app builds, remove test links).

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

## Phase 2 (built)
- Journey map (`src/world/journey.ts`): Hell 2,000 m → Stairway 2,000 m → Heaven's Gate → 3 heavenly levels of 2,500 m each → God. About 9 minutes for a good run; all lengths tunable.
- Stairway to Heaven: real climbing marble steps with gold railings, columns, angel statues, clouds; Hell's lava drops away below you
- Devil chases you 650 m up the stairs, then falls back ("YOU ESCAPED THE DEVIL")
- **The Shadow of your sins** takes over the chase right away (owner's idea after play-testing): dark hooded spirit with violet eyes, chases through the rest of the Stairway and all of Heaven; HUD meter says "YOUR SINS" (Decisions log #14)
- **Stumble rule, same everywhere:** 3 stumbles close together = caught; running clean lets the chaser drop back. From the Stairway on, the Shadow drags you down and the floor crumbles (Decisions log #15)
- Stair gaps (you can see Hell's glow through them); falling through = run over
- Heaven's Gate: giant pearly gates that swing open with light pouring out, white flash as you pass through
- Checkpoint at Heaven's Gate: crash in Heaven → "TRY AGAIN from Heaven's Gate"; menu shows CONTINUE; remembered after closing the game
- Level 1 The Heavenly Gardens: garden path, trees, fountains; hedges, vine arches, topiary trees
- Level 2 The Celestial Bridges: crystal bridges over the clouds, floating islands; crystal pillars; narrow paths where two lanes fall away
- Level 3 The Golden Kingdom: gold tiles, golden towers and temples; hardest mix
- Sky, fog, light and floating particles blend smoothly from world to world; God's light grows ahead in Heaven
- Level complete bonus (+500 points), journey progress bar in the HUD, stage name, Heaven colour scheme
- Reaching the end shows "You have reached God" (placeholder until judgment in Phase 3)

## Phase 3 (built)
- Lost souls (glowing ghosts reaching up): run through one to help it → + GRACE; it rises into the sky. Miss it → counts against you
- Temptations (piles of cursed red gold, +25 coins): take it → + SIN; pass it by → + GRACE. Usually placed right before an obstacle (riskier path)
- Miracle Shield (spinning golden halo, rare): halo around you that absorbs one hit (stumble, wall crash or fall); also + GRACE
- Sin/Grace meter in the HUD with the 70% pass mark; pop-up messages for every choice
- The Shadow looks bigger the more temptations you take (rules unchanged)
- Final stage "The Light of God": you slow to a walk, the Shadow can't follow, the screen fills with light
- God's judgment: glowing words, your journey counted line by line, Grace %, verdict and the exact reasons; tap to skip
  - Fail (< 70%): "You are not yet ready." → RETURN TO HELL (new course, checkpoint cleared)
  - Pass: "You are free to roam." → +500 coins (+1,000 at 85% "Blessed", +2,000 at 100% "Perfect"), Ascended State unlocked (placeholder until Phase 4), ASCENDED badge on the menu
- Restarting from the Heaven's Gate checkpoint keeps your Sin/Grace record
- Saved on the device: Ascended unlocked, best Grace %, perfect judgments, times God was reached

## Phase 4 (built)
- ASCENDED RUN on the menu once judgment is passed (journey still playable as NEW JOURNEY)
- Endless map: worlds rotate every 1,500 m — The Golden Clouds, The Celestial Gardens, The Crystal Bridges, The Cosmic Heavens (new: starry violet sky, planets with rings, crystal spires, glowing glass path)
- Starts faster (15 m/s, up to 32) and keeps getting harder (obstacle gaps keep shrinking)
- No chaser: "YOUR LIGHT" meter; 3 stumbles close together = "Your light went out!"
- Score multiplier x1→x5: +1 every 250 m without a stumble; a stumble resets to x1
- Ability button (bottom right) fills as you collect coins and run cleanly; tap when full (or E/Enter on a computer). Slowed down twice after owner play-tests (was ~10 s → ~30 s → now ~55 s per charge: 200 coins, or 5,000 m of clean running)
  - Flight Burst (fly above everything 3 s) — unlocked on ascending
  - Slow Motion (world at half speed 4 s) — unlocks at 1,500 m in an Ascended run
  - Celestial Magnet (collects all coins close ahead, any lane, 8 s) — unlocks at 3,000 m
  - Choose which ability to bring on the menu; locked ones show how to unlock them
- No souls/temptations in the Ascended State; Miracle Shields still appear
- Ascended scores saved separately (the competitive score): best score, best distance, local top 5 shown on the game-over screen
- Fixed: after restarting a run, the first obstacles could briefly reuse the wrong 3D model

## Phase 5 (built)
- SHOP button on the menu, with your coin balance (coins earned before the shop became spendable)
- Outfits: Pilgrim (free), Angel 800, Fallen 1,500, Golden One 4,000
- Wings (flap behind you, open wide during Flight Burst): Angel 1,200, Bat 1,500, Crystal 3,000, Wings of Fire 4,000
- Trails (glowing particles behind you): Light 600, Embers 900, Stardust 2,000, Golden Path 3,500
- Shop shows a close-up of your runner wearing what you pick; buy = equip; WEAR to switch
- Ability upgrades: 3 levels each (1,000 / 2,500 / 5,000): Flight 3→4.5 s, Slow Motion 4→5.5 s, Magnet 8→12.5 s
- Daily reward pop-up: 7-day streak 100, 150, 200, 300, 400, 600, 1,000 coins; missing a day restarts it
- No real-money purchases (decide in Phase 7)

## Phase 6 (built — live)
- LEADERBOARD button on the menu: TODAY / THIS WEEK / ALL TIME tabs, top 50, your row highlighted, "Your best · rank #N of M"
- Choose a heavenly name (6 generated choices, "show other names"; no typing); change it any time
- Only Ascended State scores are sent; each phone has an anonymous player ID (no sign-in or personal info)
- Score checks on the server AND in the game (impossible speed, too many points for the distance, made-up names refused) + max one submission per 15 s per player
- No internet: "Saved — it will go online next time you have internet"; sent automatically next launch
- Server setup script: `supabase/setup.sql`; owner steps: `supabase/SETUP.md`; settings go in `src/core/online.ts`
- Until set up, the leaderboard screen says it isn't switched on yet (game works normally)

## How it was tested
- 86 automatic tests (`npm test`), incl. leaderboard client (fake server), score checks, heavenly names; shop buying/equipping, upgrades capped at 3, daily streak, wallet; the Ascended map, multiplier, abilities and unlocks, Ascended top 5;, incl. the 3-stumble rule, the Devil→Shadow hand-over, judgment math (70/85/100), Miracle Shield, checkpoint keeping Sin/Grace
- Browser test (leaderboard) against a pretend server with the same rules: Ascended run → choose name → score sent once → rank shown → leaderboard tabs; offline → score kept and message shown
- Browser test (shop): daily reward pop-up and claim, old save's coins become spendable, buying outfit/wings/trail, not-enough-coins message, upgrade, looks shown while running, everything kept after reload
- Robot survives 4,000 m of the Ascended State on 5 random courses
- Browser test (Ascended): menu ability picker, all 4 worlds, Flight Burst lifting the runner, 3 stumbles → "Your light went out!", Slow Motion unlock message, top 5, RUN AGAIN
- Robot "saint" (helps souls, resists temptations) passes judgment on 4 random courses; robot "sinner" (grabs temptations) fails on all 4: state machine, lanes, jump/slide, swipe detection (incl. long swipes = one move), collisions, Devil, score, save data
- Robot player test: survives Hell + Stairway on 30 random courses, and completes the WHOLE journey to God on 15 random courses with every stage, level bonus and checkpoint firing in order
- Browser flow test: teleported through every stage in a phone-sized browser; checked game states, the Devil giving up, checkpoint save, TRY AGAIN from the Gate, God screen, and CONTINUE after reloading
- Played in a headless phone-sized browser (Pixel 7, iPhone 13 sizes): real swipe events, jump, coins, stumble, crash, game over, run again, pause, resume — no errors

## Phase 1 checklist
- [x] Project setup (Vite + TypeScript + Three.js + Vitest)
- [x] GitHub Pages auto-deploy (repo made public, Pages source = GitHub Actions, first deploy succeeded)
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
- [x] Tested on phone by the owner

## Remaining phases
2. ~~Heaven ascension~~ (done)
3. ~~Sin, Grace & judgment~~ (done)
4. ~~Ascended State~~ (done)
5. ~~Economy & customization~~ (done)
6. ~~Global competition~~ (done, live)
7. Polish & release (art, music, performance, Capacitor builds, store release)

## Known bugs / limits
- **MUST DO before release (Phase 7):** remove the test links — `?gift` (free coins), `?ascended`, `?stage=`.
- FIXED: a ?stage= test link showed a big CONTINUE button (saved checkpoint) that went to Heaven's Gate instead of the chosen stage. Test links now show one START button for that stage (found by the owner).
- FIXED: Level 2 (Celestial Bridges) obstacles were hard to see (pale crystal on a pale bridge). Now royal blue with gold edges; gaps are dark holes with glowing outlines. Level 3 obstacles changed to white marble so they stand out on the gold floor (found by the owner).
- FIXED: a long swipe from an outer lane jumped two lanes to the far side. Now each swipe moves exactly one lane (found by the owner on their phone).
- No sound yet (planned for later; must be original or licensed)

- When the Devil or the Shadow is right on your heels it partly hides the player (only just before it catches you).

## Art pack (for Blender / artists)
- `art/models/` — all 70 game models as .glb (characters, wings, obstacles per world, scenery, track, Heaven's Gate, pickups)
- `art/BLENDER_GUIDE.md` — how to open them in Blender, size/placement/triangle rules, animation names, export settings, how to send models back (`art/incoming/`)
- `art/reference/` — a picture (PNG) of every model, for Hyper3D image prompts
- `art/HYPER3D_PROMPTS.md` — a ready-to-paste Hyper3D prompt for every model, settings, Mixamo steps for animation, work order
- `art/final-freedom-art-pack.zip` — guides + models + pictures in one download
- Refresh after art changes: `node scripts/export-models.cjs && node scripts/render-refs.cjs`
- `ASSETS.md` — who made each asset and its licence

## Phase 7 — in progress
- **Sound effects (built):** 37 effects + quiet world ambience (lava rumble in Hell, wind in Heaven, space hum in the Cosmic Heavens), all synthesized in code — original, no licences (Decisions log #36). Coins rise in pitch in a row; heartbeat when the chaser is close; Devil roar at the start; Heaven's Gate chord; judgment chords.
- **Settings screen (built):** sound effects on/off, volume, world sounds on/off, "Preview sounds" list, music placeholder for the owner's songs.
- Fixed after owner test: some sounds were nearly silent on phone speakers (too deep) — added higher tones; the render check now also simulates a phone speaker. First tap now waits for the sound system to wake up.
- Tested: every sound rendered and measured, including through a simulated phone speaker (none distort, none too quiet; WAVs in `art/sounds/`); browser run confirmed the right sounds fire in order; settings saved.
- Next: owner's music (when ready), app packaging, money features, paid item list, remove test links.

## Technical decisions
- Supabase project: https://aiwocmrtanrrhvzeugrw.supabase.co (publishable key in `src/core/online.ts` — public by design). Never commit the secret/service_role key.
- Claude's cloud environment "heaven-and-hell" allows the Supabase host and frmconnect.github.io so the leaderboard and published site can be tested.
- Web-first with Three.js so Claude can build and test everything end to end and the owner can play each version on a phone. Package with Capacitor for Android/iOS later.
- Game rules (`src/core/RunSession.ts` and friends) are separate from the 3D drawing, so they can be tested by a robot player without a screen.
- All balancing numbers live in `src/core/config.ts`.
- Obstacles are pooled and coins are drawn in one batch, for phone performance.
- **Collision rules (confirmed by owner — Decisions log #9):**
  - Hitting a fire barrier or burning beam = stumble: you slow down briefly and the Devil gains on you.
  - Three stumbles close together = the Devil (or the Shadow) catches you (changed from two by the owner — Decisions log #15).
  - Running head-first into a rock wall = crash, run over.
  - Clipping a wall from the side while changing lanes = bounce back + stumble.
  - Lava pit = you fall in, run over.
- Owner made the repo public so GitHub Pages is free; owner approved merging work into `main`.
- Backup play link: `scripts/make-single-file.mjs` packs the build into one file, published as a private claude.ai page.

## Open design decisions
- **Money (Decisions log #35, at launch):** rewarded ads (double coins after a run, double daily reward; never during runs, never in leaderboard runs) + real-money cosmetics and a supporter pack. Still to choose: the paid items and prices. Needs: AdMob account, banking/tax info in both developer accounts (owner), ad consent pop-up, updated privacy forms. Built during app packaging (needs the native apps).
- **Music:** owner is making original songs (Decisions log #33). When ready: Settings screen with music on/off, volume, choose a song or shuffle; sound effects on/off.
- More shop items: owner will suggest ideas.
- **Journey length:** currently ~9 minutes for a good run (target 10–15). Tune after play-testing.
- Exactly how runs vary after a failed judgment (see Decisions log in GAME_DESIGN.md)
- Art source for final version (free CC0 models vs. commissioned artist)
