# CLAUDE.md — Heaven & Hell (working title)

Read this file at the start of every session. Then read `PROGRESS.md` to see where we left off.

## Who you're working with
- The owner is the creator of this game and **does not know how to code**. You write, run and test all of the code.
- Explain things in plain language. No jargon without a one-line explanation.
- The owner usually works **from a phone**. Keep messages short and tell them exactly how to play-test each change (a link they can open on their phone).
- Before building a major system, briefly explain what it does, why the game needs it, and any decision they need to make. Recommend an option, then wait for their answer on real design decisions.
- **Never silently change the game design.** `GAME_DESIGN.md` is the source of truth. If something there seems like a bad idea, say so and suggest alternatives, but let the owner decide.

## What the game is
A 3D mobile endless runner (Temple Run / Subway Surfers style) with a journey:
**Hell → Stairway to Heaven → Heaven's Gate → Heavenly levels → God (judgment) → Ascended State → endless mode → leaderboards.**
Escape Hell. Climb to Heaven. Face Judgment. Earn Freedom. Compete for Eternity.

Full details are in `GAME_DESIGN.md`. The "Decisions log" at the top of that file overrides anything below it.

## Tech stack (decided)
- **Three.js** (3D) + **Vite** (dev server/build) + **TypeScript**.
- **Vitest** for unit tests of game logic (scoring, Sin/Grace, state machine, lane logic, save data).
- **GitHub Pages** via a GitHub Actions workflow so every push to `main` publishes a playable link the owner opens on their phone.
- Later: **Capacitor** to package the web game as Android and iOS apps for the stores.
- Art for now: stylized low-poly visuals built in code (shapes, emissive materials, fog, particles, lighting). Later, swap in free CC0 3D models (e.g. Kenney, Quaternius) or commissioned art. Record every third-party asset and its license in `ASSETS.md`.
- Audio: original or properly licensed only. Record in `ASSETS.md`.
- No paid services without asking the owner first.

## Code rules
- Modular code: one system per file, clear responsibilities. No giant single script.
- Suggested layout:
  ```
  src/
    main.ts              # boot
    core/                # GameStateManager, game loop, event bus, config
    input/               # swipe + keyboard input
    player/              # PlayerController, lanes, jump/slide, collisions
    world/               # track/segment generator, obstacles, environments (hell/, heaven/)
    enemies/             # DevilChaseController
    systems/             # score, coins, power-ups, sin-grace, judgment, save data
    ui/                  # HUD, menus, judgment screen (HTML/CSS overlay)
    audio/
  tests/
  public/                # static assets
  ```
- Game states managed centrally: MainMenu, HellRun, HeavenAscent, HeavenLevel, Judgment, JudgmentFailed, AscendedUnlocked, AscendedRun, GameOver, Paused.
- Mobile first: touch swipes (left/right/up/down), also keyboard arrows for desktop testing. Works in portrait on all phone sizes. Target 60 fps on mid-range phones; keep draw calls and polygon counts low, reuse objects (pooling) for obstacles and coins.
- Handle errors; never let a crash leave a blank screen.
- Put tunable numbers (speeds, lane width, Devil distance, Grace thresholds) in one config file so balancing is easy.

## Working rules (from the design doc)
1. Don't change the central concept or remove: the Hell-to-Heaven progression, the Devil chase, the Sin/Grace judgment.
2. Global competitive scores only unlock after reaching God and passing judgment.
3. No pay-to-win. Leaderboard scores are earned, never bought.
4. Keep the first journey short (see Decisions log).
5. Build one system at a time. Test it (unit tests + run the build) before moving on.
6. **Never claim a feature works until it is implemented and tested.** Say what you tested and how.
7. Preserve working features when adding new ones.
8. Commit small, working steps with clear messages.

## Tracking
Keep `PROGRESS.md` up to date at the end of every working session:
completed features, in progress, remaining, known bugs, technical decisions, open design decisions, and the current play-test link.
