# GAME DESIGN DOCUMENT — Heaven & Hell (working title)

## DECISIONS LOG (overrides anything below that conflicts)

1. **Name:** Working title changed from "Heaven's Gate" to **"Heaven & Hell"**. Final name still open. Inside the game, "Heaven's Gate" stays as the name of the gate/milestone.
2. **Engine:** **Three.js + Vite + TypeScript (web first)** instead of Unity, because the owner doesn't code and works from a phone: Claude can build and test everything, and every version is playable from a link. Package for Android/iOS with Capacitor later. Section 17's system list and game states still apply, written in TypeScript.
3. **Failing judgment:** Like other free runners, the player **starts again from the beginning in Hell**. To keep restarts fresh, each new attempt changes things up: obstacle patterns, spacing and timing are varied per run, so it's never the exact same course twice. Exact variation rules to be decided in Phase 3.
4. **Journey length:** Keep the full journey to God short enough that restarting isn't painful (start with ~10–15 minutes and tune through play-testing).
5. **Showing God:** Recommended to show God as overwhelming light and a voice rather than a figure. (Recommendation — owner to confirm in Phase 3.)
6. **Heavenly levels:** Launch with 2–3 heavenly levels; add more after release.
7. **Leaderboards:** Start with local high scores. For online, consider Apple Game Center / Google Play Games Services before building a custom server.
8. **Art for the prototype:** Stylized low-poly visuals built in code; real 3D models added later.
9. **Collision rules (confirmed by owner after phone play-test):** Hitting a fire barrier or burning beam = stumble (you slow down and the Devil gains on you; **three stumbles close together** and he catches you — changed from two by the owner, see #15). Running head-first into a rock wall = run over. Falling into lava = run over. Clipping a wall from the side while changing lanes = bounce back + stumble.
10. **Hell length:** About 2–3 minutes (~2,000 m) before the Stairway to Heaven appears. Tune through play-testing.
11. **Devil on the Stairway:** He chases you up the first part of the stairs, then can't follow into the light and falls back with a roar. Big "I escaped!" moment. (The Shadow of your sins then takes over — see #14.)
12. **Checkpoint:** Reaching Heaven's Gate is a checkpoint. Crashing after the Gate restarts you at the Gate. Only failing judgment sends you back to Hell (Decision #3).
13. **Falling through a stair gap:** A dramatic fall with Hell visible below, then the run is over (same as falling into lava).
14. **The Shadow of your sins (owner's choice after play-testing the Stairway):** When the Devil gives up on the Stairway, a dark ghostly spirit made of your sins rises and takes over the chase right away, through the rest of the Stairway, the Gate and all heavenly levels. Same rules as the Devil: stumbles let it close in, three stumbles close together and it catches you (run over, see #15). In Phase 3 it can grow stronger the more Sin you carry.
15. **Stumble rule, same everywhere (owner):** 3 stumbles close together ends the run, in every stage. Running clean for a few seconds lets the chaser drop back again, so it's never impossible to recover. In Hell the Devil grabs you; from the Stairway on, the Shadow grabs you, the floor crumbles and you fall away toward Hell.

---

HEAVEN'S GATE

Complete Game Design Document & Master Development Brief

Version: 1.0
Project type: Mobile video game
Genre: 3D Endless Runner / Adventure / Progression
Platforms: Android and iOS
Working title: Heaven's Gate

---

1. THE GAME'S VISION

Heaven's Gate is a mobile game inspired by Temple Run and Subway Surfers, but with a larger progression system and a distinctive journey.

The player begins in Hell, running from the Devil. Their objective is to escape Hell, reach the Stairway to Heaven, climb toward Heaven's Gate, progress through heavenly levels, and eventually reach God.

Upon reaching God, the player is judged based on their actions throughout the journey.

If they pass judgment, God rewards them with in-game currency, abilities, and the freedom to roam.

This unlocks the game's true endless competitive mode, where players attempt to achieve the highest score possible and compete against players around the world.

The game has two primary stages:

1. The Journey: Escape Hell, ascend through Heaven, and prove yourself worthy.
2. The Ascended State: Unlock freedom, abilities, infinite gameplay, and global competition.

The most important design principle is that the player must earn access to the competitive endless mode. The global high-score competition does not begin until the player has reached God and passed judgment.

2. THE GAME'S COMPLETE PROGRESSION

The intended progression is:

HELL → STAIRWAY TO HEAVEN → HEAVEN'S GATE → HEAVENLY LEVELS → GOD → ASCENDED STATE → INFINITE MODE → GLOBAL LEADERBOARD

Each stage should have its own visual identity, gameplay challenges, obstacles, atmosphere, and progression.

STAGE 1: HELL

The player starts in Hell.

The Devil is chasing the player, creating immediate pressure and urgency.

The environment should include:

- Volcanic landscapes.
- Lava rivers and pools.
- Fire and burning structures.
- Collapsing bridges.
- Demonic creatures.
- Dangerous terrain.
- Infernal architecture.
- Souls and other atmospheric environmental elements.

Gameplay:

- The player runs forward automatically.
- The Devil chases behind them.
- The player dodges obstacles.
- The player jumps over hazards.
- The player slides under obstacles.
- The player moves between lanes.
- The player collects coins and useful items.
- The player searches for the route leading toward the Stairway to Heaven.

The Devil should remain an active threat.

If the player makes mistakes, collides with obstacles, or loses momentum, the Devil can get closer.

The Devil should be visually intimidating and recognizable.

STAGE 2: THE STAIRWAY TO HEAVEN

After escaping Hell, the player reaches an enormous staircase ascending into the clouds.

This is one of the game's defining visual moments.

The staircase should feel enormous, mysterious, and seemingly endless.

Environment ideas:

- Giant white marble staircases.
- Golden railings.
- Floating platforms.
- Clouds.
- Heavenly light.
- Celestial architecture.
- Angelic statues.
- Floating islands.
- Heavenly waterfalls.
- Beautiful distant architecture.

The player continues the endless-runner gameplay.

The difficulty should gradually increase.

Obstacles can include:

- Broken staircase sections.
- Falling structures.
- Moving platforms.
- Heavenly barriers.
- Fire or energy hazards.
- Falling objects.
- Narrow pathways.
- Gaps between staircases.
- Environmental traps.

The player should feel that they are escaping something and moving toward something greater.

STAGE 3: HEAVEN'S GATE

The player eventually reaches Heaven's Gate.

This should be a major milestone and an important cinematic moment.

The gates should be enormous, detailed, bright, and visually impressive.

Possible features:

- Giant pearly gates.
- Golden architecture.
- Clouds surrounding the entrance.
- Bright light coming from beyond the gates.
- Angels or celestial guardians.
- A grand entrance animation.

Reaching Heaven's Gate does not finish the game.

It unlocks the next progression stage.

STAGE 4: HEAVENLY LEVELS

After entering Heaven, the player must complete additional levels to reach God.

This changes the progression from simply escaping Hell to actively progressing through Heaven.

Each heavenly level should introduce new challenges, environments, obstacles, and visual experiences.

Possible level concepts:

1. The Gates of Heaven.
2. The Heavenly Gardens.
3. The Celestial Bridges.
4. The Realm of Angels.
5. The Golden Kingdom.
6. The Higher Heavens.
7. The Divine Staircase.
8. The Final Ascent.

These are proposed level names and can be expanded or changed.

Each level should have:

- Its own environment.
- Distinct obstacles.
- Increasing difficulty.
- Collectible rewards.
- Level completion objectives.
- A clear route toward the next level.

The player should gradually feel that they are getting closer to God.

The final destination is where the player encounters God.

STAGE 5: MEETING GOD

This is the most important progression milestone in the game.

When the player reaches God, normal gameplay pauses.

The scene should become cinematic.

Suggested sequence:

1. The player enters a beautiful divine environment.
2. The environment becomes quiet.
3. The player approaches God.
4. A judgment sequence begins.
5. The game displays the player's journey statistics.
6. God determines whether the player has passed judgment.

The judgment system should consider the player's actions throughout the journey.

Possible statistics:

- Grace accumulated.
- Sin accumulated.
- Souls helped.
- Temptations accepted.
- Obstacles overcome.
- Miracles collected.
- Optional challenges completed.

Judgment outcomes

If the player fails:

God sends the player back to Hell.

Suggested dialogue:

"You are not yet ready."

The player must attempt the journey again and improve their actions.

If the player succeeds:

God rewards the player and unlocks the Ascended State.

Suggested dialogue:

"You are free to roam."

This is the transition into the game's permanent competitive progression system.

Important judgment design recommendation

The judgment system should use a transparent Grace/Sin threshold rather than requiring an absolutely perfect run every time.

For example:

- 70% Grace: Pass.
- 85% Grace: Additional reward.
- 100% Grace: Perfect judgment bonus.

These are initial balancing suggestions, not final requirements.

A perfect journey should be rewarded, but ordinary successful players should not be forced to repeat the entire game endlessly because of one small mistake.

The player should always understand why they passed or failed.

3. THE SIN AND GRACE SYSTEM

This is one of the game's defining mechanics.

The player should have a visible Sin/Grace meter during the journey.

Grace: Represents positive actions and decisions.

Sin: Represents negative actions and decisions.

Possible positive actions:

- Helping lost souls.
- Saving falling characters.
- Choosing safer or more selfless routes.
- Completing certain challenges.
- Collecting miracles.
- Resisting temptations.

Possible negative actions:

- Accepting temptations.
- Taking certain dangerous shortcuts for rewards.
- Choosing selfish alternatives in specific encounters.
- Using certain cursed power-ups.

The system should not make every ordinary collision count as a moral failure. Gameplay mistakes and moral choices should be distinguishable.

Temptation system

Temptations should create meaningful decisions.

For example:

A valuable coin collection might be positioned along a dangerous path.

A special power-up might give the player an immediate advantage but increase Sin.

The player must decide whether the immediate benefit is worth the potential consequences at judgment.

This adds strategic depth to a game that otherwise relies primarily on reflexes.

4. POWER-UPS AND COLLECTIBLES

The game should feature items associated with Heaven, Hell, miracles, and other elements of the environment.

Main currency: Coins

Coins are collected during gameplay.

They can be used to:

- Unlock characters.
- Purchase cosmetics.
- Upgrade abilities.
- Unlock visual effects.
- Purchase additional customization options.

Miracles

Miracles are special items associated with Heaven.

Their primary purpose is to provide protection or another opportunity.

Examples:

- Miracle Shield: Protects against one collision.
- Second Chance: Revives the player after a fatal mistake.
- Divine Protection: Provides temporary invincibility.
- Healing Light: Restores a depleted resource, if one is implemented.
- Celestial Boost: Temporarily increases speed.

Additional power-ups

Angel Wings

- Temporarily allow the player to fly over obstacles.

Divine Speed

- Temporarily increases running speed.

Time Slow

- Slows down the environment, allowing the player to dodge obstacles more easily.

Heavenly Magnet

- Attracts nearby coins.

Golden Shield

- Protects against obstacles.

Hellfire Boost

- A temporary speed boost with a possible Sin trade-off.

Power-ups should have clear durations, cooldowns, and visual effects.

5. FALLING INTO HELL

Falling should have an important role in the game.

If the player falls off the staircase or misses a platform, they should fall toward Hell.

Possible mechanics:

- The player sees Hell below them.
- The Devil becomes visible again.
- The player experiences a falling animation.
- The player either loses the run or enters a designated Hell recovery sequence.

This can become an important visual and gameplay feature.

The fall should feel dramatic.

6. THE ASCENDED STATE — THE MAIN ENDGAME

Once the player reaches God and passes judgment, they unlock the Ascended State.

This is the version of the game where the player is free to roam.

This was selected as the preferred endgame direction.

The Ascended State should introduce:

- Faster and smoother movement.
- More advanced obstacles.
- Increasing difficulty.
- New environments.
- Special abilities.
- More powerful collectibles.
- Greater scoring opportunities.
- Infinite gameplay.

The player should feel different after ascending.

They have completed the original journey and are now free to explore and compete.

Ascended abilities

Possible permanent or upgradeable abilities:

1. Flight Burst.
2. Slow Motion.
3. Miracle Shield.
4. Divine Dash.
5. Celestial Magnet.
6. Temporary Invincibility.

These should be balanced so that skill remains more important than purchased upgrades.

Ascended environments

The endless mode should not remain visually identical forever.

Possible environments:

- Heavenly Kingdom.
- Golden Clouds.
- Celestial Gardens.
- Floating Temples.
- Divine Architecture.
- Infinite Stairways.
- Cosmic Heavens.

Environments can rotate, transition, or be unlocked through progression.

7. THE GLOBAL HIGH-SCORE SYSTEM

This is a critical design requirement.

The official competitive high-score system only unlocks after the player reaches God and passes judgment.

Before that point, the player is completing the qualification journey.

After that point, the player can participate in endless competitive gameplay.

Competitive system

The game should feature:

- Global leaderboard.
- Daily leaderboard.
- Weekly leaderboard.
- All-time leaderboard.
- Player rankings.
- Personal best.
- Distance records.
- Score records.
- Friends leaderboard, if social features are implemented.

The objective is to achieve the highest possible score.

Players worldwide should be able to compete.

The competitive score should be earned through gameplay, not purchased.

Score system

The score should consider:

- Distance traveled.
- Coins collected.
- Obstacles successfully avoided.
- Power-ups collected.
- Consecutive successful maneuvers.
- Score multipliers.
- Special challenges.

Difficulty should increase as the player continues.

The longer the player survives, the more difficult the game becomes.

The scoring system should reward skill, consistency, and risk management.

Important technical requirement

Global leaderboards must be server-backed.

The game should validate scores to reduce cheating.

A local high score alone is not sufficient for a global competitive system.

For the first prototype, local leaderboards can be used. Online leaderboards can be integrated in a later development phase.

8. GAME CONTROLS

The game should use familiar mobile endless-runner controls.

Recommended controls:

- Swipe left: Move left.
- Swipe right: Move right.
- Swipe up: Jump.
- Swipe down: Slide.
- Tap an ability button: Activate a special ability.

The player should automatically run forward.

Controls must be responsive, predictable, and comfortable on touchscreen devices.

The game should support different mobile screen sizes and aspect ratios.

9. VISUAL DIRECTION

Heaven's Gate should be a visually impressive 3D game.

The contrast between Hell and Heaven is essential.

Hell

Visual identity:

- Dark.
- Red.
- Orange.
- Black.
- Volcanic.
- Dangerous.
- Intimidating.

Heaven

Visual identity:

- White.
- Gold.
- Light blue.
- Bright clouds.
- Marble.
- Celestial architecture.
- Peaceful but mysterious.

Ascended State

Visual identity:

- More luminous.
- Grand celestial environments.
- Advanced heavenly architecture.
- Floating structures.
- More elaborate effects.
- Increasingly spectacular environments.

The environments should feel like different worlds rather than simple color changes.

The game should prioritize a consistent art direction.

10. AUDIO AND MUSIC

Audio should reinforce the emotional transition between worlds.

Hell

- Dark atmospheric music.
- Intense percussion.
- Fire and lava sounds.
- Devil footsteps.
- Demonic environmental sounds.

Stairway to Heaven

- Increasingly uplifting music.
- Wind.
- Heavenly ambience.
- Footsteps on marble or stone.

Heaven

- Atmospheric orchestral music.
- Choir textures.
- Celestial sound effects.
- Peaceful environmental sounds.

Meeting God

- Music becomes quieter.
- A cinematic transition.
- Powerful orchestral or ambient sound.
- Distinct judgment sound effects.

Ascended State

- More energetic music.
- Epic orchestral and electronic elements.
- Dynamic music that responds to gameplay intensity.

The soundtrack should be original or properly licensed.

11. GAME ECONOMY AND MONETIZATION

The game should have a sustainable in-game economy.

Possible currencies:

Coins

- Main collectible currency.
- Earned through gameplay.

Miracles

- Special ability-related items.
- Earned through challenges and gameplay.

Heavenly Tokens

- Optional premium or achievement currency.
- Can be used for cosmetic unlocks.

Potential monetization:

- Cosmetic character skins.
- Angel wings.
- Devil-themed skins.
- Character customization.
- Trails and visual effects.
- Optional rewarded advertisements.
- Cosmetic bundles.

Avoid pay-to-win mechanics.

Players should not be able to purchase their way onto the global leaderboard.

The judgment system and access to Ascended Mode should be earned through gameplay.

12. CHARACTER SYSTEM

The initial game should have one primary playable character.

Additional characters can be unlocked later.

Possible character categories:

- Human.
- Angel-inspired characters.
- Celestial characters.
- Fallen characters.
- Other fantasy-inspired characters.

Characters may have different appearances and animations.

If characters have gameplay abilities, their competitive advantages must be balanced.

Cosmetic differences should not create unfair leaderboard advantages.

13. GAME DIFFICULTY AND PACING

The game should gradually introduce difficulty.

Suggested initial pacing targets:

- First Heaven's Gate milestone: approximately 5–10 minutes.
- Reaching God: approximately 15–25 minutes of total progression.
- Ascended State: Infinite gameplay.

These are prototype targets and should be adjusted through actual playtesting.

The original concept considered a much longer journey, potentially around two hours, but a shorter initial qualification experience is recommended for mobile retention.

Difficulty should increase progressively rather than suddenly.

14. MULTIPLAYER AND SOCIAL FEATURES

The primary competitive feature is global high-score competition.

Live multiplayer is not necessary for the initial release.

A recommended first implementation is asynchronous competition.

Possible future features:

- Friends lists.
- Friend leaderboards.
- Player profiles.
- Ghost runs showing other players' performances.
- Global rankings.
- Weekly tournaments.
- Seasonal challenges.
- Achievements.
- Shareable records.

Ghost runs could let players see a representation of another player's run without requiring both players to be online simultaneously.

15. THE MAIN GAMEPLAY LOOP

The complete intended loop:

1. Start in Hell.
2. Run away from the Devil.
3. Avoid obstacles and hazards.
4. Collect coins and power-ups.
5. Make decisions affecting Sin and Grace.
6. Escape Hell.
7. Reach the Stairway to Heaven.
8. Climb toward Heaven's Gate.
9. Enter Heaven.
10. Complete the heavenly levels.
11. Reach God.
12. Undergo judgment.
13. If unsuccessful, return to Hell and try again.
14. If successful, receive rewards and unlock the Ascended State.
15. Enter infinite gameplay.
16. Compete for global high scores.
17. Unlock more abilities and cosmetics.
18. Continue improving personal and global rankings.

The player should always have something to work toward.

16. USER INTERFACE

The interface should be modern, clean, and designed for mobile.

Main menu

Suggested options:

- Play.
- Character.
- Upgrades.
- Abilities.
- Shop.
- Leaderboards.
- Settings.

During gameplay

Display:

- Current score or distance.
- Coins collected.
- Sin/Grace meter during the qualification journey.
- Active power-ups.
- Ability buttons.
- Pause button.

The qualification journey and Ascended Mode can have different HUD layouts.

Judgment screen

Display:

- Grace.
- Sin.
- Souls helped.
- Temptations accepted.
- Journey performance.
- Judgment result.

Ascended Mode

Display:

- Current competitive score.
- Personal best.
- Global ranking.
- Coins.
- Active abilities.

17. TECHNICAL DEVELOPMENT REQUIREMENTS

Claude should first assess which game engine and development architecture are most appropriate.

Recommended starting direction:

Unity with C#

Reasons:

- Strong 3D mobile game development support.
- Established endless-runner development workflows.
- Android and iOS export.
- Physics and animation systems.
- Asset management.
- Mobile optimization.
- Large development ecosystem.

Other engines can be considered if there is a compelling reason.

Core technical systems

The game should be developed with modular architecture.

Recommended systems:

1. PlayerController.
2. PlayerInputController.
3. RunnerMovementSystem.
4. LaneSwitchingSystem.
5. JumpAndSlideSystem.
6. ObstacleManager.
7. EnvironmentGenerator.
8. HellEnvironmentManager.
9. HeavenEnvironmentManager.
10. LevelProgressionManager.
11. DevilChaseController.
12. SinGraceManager.
13. CollectibleManager.
14. PowerUpManager.
15. PlayerCurrencyManager.
16. JudgmentManager.
17. AscendedStateManager.
18. ScoreManager.
19. LeaderboardManager.
20. SaveDataManager.
21. AudioManager.
22. UIManager.
23. GameStateManager.

The architecture should avoid placing the entire game inside one enormous script.

Use reusable components and clearly defined responsibilities.

Game states

Suggested states:

- MainMenu.
- HellRun.
- HeavenAscent.
- HeavenLevel.
- Judgment.
- JudgmentFailed.
- AscendedUnlocked.
- AscendedRun.
- GameOver.
- Paused.

State transitions should be managed centrally.

Saving and persistence

The game should save:

- Player progression.
- Whether God has been reached.
- Whether Ascended Mode is unlocked.
- Coins.
- Purchased cosmetics.
- Unlocked abilities.
- Best personal scores.
- Settings.

The player should not lose permanent progression because of an ordinary game-over event.

Use a secure server-backed account and progression system when online services are introduced.

---

18. DEVELOPMENT ROADMAP

Build the game in stages rather than attempting everything simultaneously.

PHASE 1: PLAYABLE PROTOTYPE

First objective: Make the game playable.

Build:

- 3D player character.
- Automatic running.
- Left and right lane movement.
- Jumping.
- Sliding.
- Basic obstacles.
- Collision detection.
- Basic camera.
- Hell environment.
- Devil chasing the player.
- Game-over system.

At the end of this phase, the player should be able to run, dodge obstacles, and escape the Devil.

PHASE 2: HEAVEN ASCENSION

Build:

- Stairway to Heaven.
- Transition from Hell to Heaven.
- Heaven's Gate.
- Heavenly environments.
- Level progression.
- Additional obstacles.
- Coins and collectibles.

PHASE 3: SIN, GRACE AND JUDGMENT

Build:

- Sin/Grace tracking.
- Moral choices.
- Temptations.
- Miracle collectibles.
- Judgment screen.
- God encounter.
- Pass/fail conditions.
- Return-to-Hell sequence.

PHASE 4: ASCENDED STATE

Build:

- Ascended State unlock.
- God reward sequence.
- Infinite runner mode.
- Difficulty scaling.
- Permanent ability unlocks.
- More environments.
- Score multipliers.

PHASE 5: ECONOMY AND CUSTOMIZATION

Build:

- Currency.
- Character selection.
- Cosmetics.
- Ability upgrades.
- Shop.
- Reward systems.
- Save/load functionality.

PHASE 6: GLOBAL COMPETITION

Build:

- Player accounts.
- Server-backed leaderboards.
- Global rankings.
- Daily and weekly rankings.
- Score validation.
- Player profiles.

PHASE 7: POLISH AND RELEASE

Build:

- Improved animations.
- Music.
- Sound effects.
- Visual effects.
- Performance optimization.
- Mobile compatibility.
- Testing.
- Android release.
- iOS release.

---

19. IMPORTANT DEVELOPMENT RULES

Claude must follow these rules throughout development.

1. Do not change the central concept of Heaven's Gate.
2. Do not remove the Hell-to-Heaven progression.
3. Do not remove the Devil chase.
4. Do not remove the Sin/Grace judgment mechanic.
5. Do not unlock global competitive high scores before the player reaches God and passes judgment.
6. Do not make the game pay-to-win.
7. Do not make the initial journey unnecessarily long.
8. Keep gameplay responsive and intuitive.
9. Build modular, maintainable code.
10. Optimize for mobile performance.
11. Test each major feature before moving to the next.
12. Keep track of completed and unfinished development tasks.
13. Do not claim that a feature works until it has been implemented and tested.
14. Preserve existing working functionality when adding new systems.

20. WHAT SUCCESS LOOKS LIKE

The finished game should feel like a combination of:

- The immediate accessibility of Subway Surfers.
- The chase and obstacle gameplay of Temple Run.
- The progression and unlock systems of a modern mobile game.
- A distinctive journey through Hell and Heaven.
- A judgment system where player choices matter.
- An infinite competitive mode with global rankings.

The most important distinction is the progression structure.

Players cannot simply download the game and immediately compete for the global high score.

They must first complete the journey and reach God.

After that, they are free to roam.

The central identity of the game:

Escape Hell. Climb to Heaven. Face Judgment. Earn Freedom. Compete for Eternity.

---

21. MASTER INSTRUCTIONS FOR CLAUDE AI

You are now acting as the lead game developer, gameplay programmer, technical architect, and development partner for a mobile game called Heaven's Gate.

Your responsibility is to help turn this document into a working, playable, polished mobile game.

I am the creator and owner of the game concept. You are assisting with technical execution and development.

I want to build this game systematically, with working code and actual playable functionality.

Before writing large amounts of code:

1. Assess the available development environment.
2. Recommend the appropriate game engine and explain why.
3. Establish the project structure.
4. Identify the assets and systems needed.
5. Create a realistic implementation roadmap.

Do not attempt to create every system at once.

Start with a functioning playable prototype.

Build one system at a time, test it, and then move forward.

When writing code:

- Provide complete files where appropriate.
- Explain where each file belongs.
- Identify dependencies.
- Avoid pseudocode when working implementation is possible.
- Keep code modular.
- Handle errors.
- Optimize for Android and iOS.
- Maintain a development checklist.

When visual assets are required, help identify suitable assets, create asset specifications, or generate original assets where supported.

The visual direction must remain consistent across Hell, Heaven, and the Ascended State.

I want this to become an actual mobile game, not simply a demonstration or a collection of disconnected scripts.

If there are important decisions that have not been finalized, explain the options and recommend the best approach before implementing them.

Do not silently change the game design.

Maintain a record of:

- Completed features.
- Features currently being developed.
- Remaining features.
- Known bugs.
- Technical decisions.
- Outstanding design decisions.

Your first assignment:

Review this complete game design document and give me:

1. Your recommended development engine.
2. The required software and tools.
3. The complete project folder structure.
4. The recommended technical architecture.
5. The first playable prototype development plan.
6. The first set of files and scripts we need to create.

Then begin development with the Hell environment, player movement, obstacle avoidance, and Devil chase.

We will build Heaven's Gate together, one working system at a time.

END OF MASTER GAME DESIGN DOCUMENT
