import * as THREE from 'three';
import { CONFIG } from './config';
import { GameState, GameStateManager } from './GameStateManager';
import { RunSession, type RunStart } from './RunSession';
import { DevilAvatar } from '../enemies/DevilAvatar';
import { ShadowAvatar } from '../enemies/ShadowAvatar';
import { InputController } from '../input/InputController';
import { PlayerAvatar } from '../player/PlayerAvatar';
import { ABILITIES, ABILITY_ORDER, isUnlocked, type AbilityId } from '../systems/Abilities';
import { SaveData } from '../systems/SaveData';
import { giveTesterGift, itemById, Shop } from '../systems/Shop';
import { Leaderboard, newPlayerId } from '../systems/Leaderboard';
import { ONLINE } from './online';
import { LeaderboardScreen } from '../ui/LeaderboardScreen';
import { TrailRenderer } from '../player/TrailRenderer';
import { ShopScreen } from '../ui/ShopScreen';
import { judge } from '../systems/SinGrace';
import { HUD } from '../ui/HUD';
import { Screens } from '../ui/Screens';
import { CoinRenderer } from '../world/CoinRenderer';
import { Crumble } from '../world/Crumble';
import { MATERIALS } from '../world/decor';
import { Environment } from '../world/Environment';
import { GATE_Z } from '../world/GateSet';
import { STAGES, stageStart, type ThemeId } from '../world/journey';
import { ASCENDED_MAP, JOURNEY_MAP, type WorldMap } from '../world/worldMap';
import { ObstacleRenderer } from '../world/ObstacleRenderer';
import { PickupRenderer } from '../world/PickupRenderer';

const END_DELAY = 1.1; // seconds of "caught!" animation before the game-over screen
const GOD_DELAY = 2.0; // seconds of light before the "reached God" screen

/** Connects everything: state, rules (RunSession), 3D drawing, input and UI. */
export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);
  private state = new GameStateManager();
  private save = new SaveData();
  private env: Environment;
  private obstacles: ObstacleRenderer;
  private coins: CoinRenderer;
  private pickups: PickupRenderer;
  private player: PlayerAvatar;
  private devil: DevilAvatar;
  private shadow: ShadowAvatar;
  private crumble: Crumble;
  private trail: TrailRenderer;
  private shop: Shop;
  private shopScreen: ShopScreen;
  private lb = new Leaderboard(ONLINE);
  private boardScreen: LeaderboardScreen;
  private hud: HUD;
  private screens: Screens;
  private session: RunSession;
  private endTimer = 0;
  private shake = 0;
  private camX = 0;
  private last = performance.now();
  private runCount = 0;
  private gateFlashed = false;

  constructor(private mount: HTMLElement, uiRoot: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    mount.appendChild(this.renderer.domElement);

    this.env = new Environment(this.scene);
    this.obstacles = new ObstacleRenderer(this.scene);
    this.coins = new CoinRenderer(this.scene);
    this.pickups = new PickupRenderer(this.scene);
    this.player = new PlayerAvatar(this.scene);
    this.devil = new DevilAvatar(this.scene);
    this.shadow = new ShadowAvatar(this.scene);
    this.crumble = new Crumble(this.scene);
    this.trail = new TrailRenderer(this.scene);
    this.shop = new Shop(this.save);
    this.session = new RunSession(1);

    this.hud = new HUD(uiRoot, () => this.pause(), () => this.useAbility());
    this.screens = new Screens(uiRoot, {
      onPlay: () => this.startRun({}),
      onContinue: () => this.startRun({ distance: this.save.data.checkpoint, coins: this.save.data.checkpointCoins, record: this.save.checkpointRecord }),
      onResume: () => this.resume(),
      onMenu: () => this.toMenu(),
      onAscend: () => {
        if (this.state.go(GameState.AscendedUnlocked)) this.screens.showAscended();
      },
      onReturnToHell: () => {
        // "You are not yet ready." Back to the start of Hell, on a brand-new course (Decisions log #3)
        if (this.state.go(GameState.JudgmentFailed)) this.startRun({ distance: 0 });
      },
      onAscendedRun: () => this.startAscended(),
      onSelectAbility: (id) => {
        this.save.data.selectedAbility = ABILITY_ORDER.indexOf(id);
        this.save.save();
      },
      onOpenShop: () => {
        this.screens.hideAll();
        this.shopScreen.open();
      },
      onOpenBoard: () => {
        this.screens.hideAll();
        this.boardScreen.open();
      },
    });
    // anonymous player id for the online leaderboard (Decisions log #32)
    if (!this.save.data.playerId) {
      this.save.data.playerId = newPlayerId();
      this.save.save();
    }
    this.boardScreen = new LeaderboardScreen(
      uiRoot,
      this.lb,
      () => ({ id: this.save.data.playerId, name: this.save.data.playerName, ascended: this.save.data.ascended > 0 }),
      (name) => {
        this.save.data.playerName = name;
        this.save.save();
        void this.sendPending();
      },
      () => {
        this.boardScreen.close();
        this.showMenu();
      },
    );
    // a score saved while offline gets sent now
    void this.sendPending();
    this.shopScreen = new ShopScreen(
      uiRoot,
      this.shop,
      () => this.applyLooks(),
      () => {
        this.shopScreen.close();
        this.showMenu();
      },
      (id) => isUnlocked(id, this.save.data.ascendedBestDistance),
    );
    this.applyLooks();
    // desktop: E or Enter uses the ability
    window.addEventListener('keydown', (e) => {
      if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') this.useAbility();
    });

    const input = new InputController(mount);
    input.onAction((a) => {
      if (this.state.isRunning) this.session.act(a);
    });

    this.state.onChange((to) => {
      this.hud.show(this.state.isRunning || to === GameState.Paused);
    });

    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
    });
    this.resize();
    // ?gift tester link: one-time 10,000 coins on this device (TESTING ONLY — remove before release)
    if (new URLSearchParams(location.search).has('gift')) {
      const got = giveTesterGift(this.save);
      const banner = document.createElement('div');
      banner.className = 'gift-banner';
      banner.textContent = got ? `+${got.toLocaleString()} coins — tester gift! Open the SHOP.` : 'Tester gift already used on this phone.';
      uiRoot.appendChild(banner);
      setTimeout(() => banner.remove(), 4000);
    }
    this.showMenu();
    // daily reward pop-up (Decisions log #27)
    this.shopScreen.showDaily(() => this.showMenu());
    requestAnimationFrame(this.frame);
  }

  private showMenu(): void {
    // a ?stage= test link: one clear button that starts at that stage (no CONTINUE)
    const test = this.testStart();
    const testName = test ? STAGES.find((s) => s.id === new URLSearchParams(location.search).get('stage'))?.name : undefined;
    // ?ascended test link: show the Ascended State on the menu without changing the save
    const ascendedOpen = this.save.data.ascended > 0 || new URLSearchParams(location.search).has('ascended');
    this.screens.showMenu(this.save.data.bestScore, !test && this.save.data.checkpoint > 0, ascendedOpen, testName, {
      best: this.save.data.ascendedBestScore,
      selected: this.selectedAbility(),
      unlocked: Object.fromEntries(ABILITY_ORDER.map((id) => [id, isUnlocked(id, this.save.data.ascendedBestDistance)])) as Record<AbilityId, boolean>,
    }, this.save.data.wallet);
  }

  /**
   * Send the best unsent Ascended score to the online leaderboard (Decisions log #32).
   * Returns a short message for the game-over screen.
   */
  private sending: Promise<string> | null = null;

  private sendPending(): Promise<string> {
    // only one send at a time (choosing a name and the game-over screen can both ask)
    if (!this.sending) this.sending = this.doSendPending().finally(() => (this.sending = null));
    return this.sending;
  }

  private async doSendPending(): Promise<string> {
    const d = this.save.data;
    if (!d.pendScore) return '';
    if (!this.lb.configured) return '';
    if (!d.playerName) return 'name';
    const r = await this.lb.submit({ playerId: d.playerId, name: d.playerName, score: d.pendScore, distance: d.pendDistance, coins: d.pendCoins, duration: d.pendDuration });
    if (!r.ok && r.error === 'offline') return 'Saved — it will go online next time you have internet.';
    if (!r.ok && r.error === 'slow') return 'Saved — sending in a moment.';
    // sent (or refused as impossible): either way it's done
    d.pendScore = d.pendDistance = d.pendCoins = d.pendDuration = 0;
    this.save.save();
    if (!r.ok) return '';
    const me = await this.lb.myRank('daily', d.playerId);
    return me ? `Online: #${me.rank} today out of ${me.players}` : 'Your score is on the leaderboard!';
  }

  /** After an Ascended run: keep its score if it's your best unsent one, then try to send it. */
  private submitAscended(score: number, distance: number, coins: number, duration: number): void {
    const d = this.save.data;
    if (score > d.pendScore) {
      d.pendScore = score;
      d.pendDistance = Math.floor(distance);
      d.pendCoins = coins;
      d.pendDuration = duration;
      this.save.save();
    }
    if (!this.lb.configured) return;
    this.screens.setOnlineNote('Sending your score…');
    void this.sendPending().then((msg) => {
      if (this.state.state !== GameState.GameOver) return;
      if (msg === 'name') {
        this.screens.setOnlineNote('Choose a name to join the online leaderboard.', {
          label: 'CHOOSE NAME',
          onClick: () => this.boardScreen.showNamePicker(() => {
            this.boardScreen.close();
            this.screens.setOnlineNote('Sending your score…');
            void this.sendPending().then((m) => this.screens.setOnlineNote(m));
          }),
        });
      } else this.screens.setOnlineNote(msg);
    });
  }

  /** Put the equipped outfit, wings and trail on the runner (Decisions log #24). */
  private applyLooks(): void {
    const o = itemById(this.shop.equipped('outfit'));
    const w = itemById(this.shop.equipped('wings'));
    const t = itemById(this.shop.equipped('trail'));
    if (o) this.player.setOutfit(o.look);
    if (w) this.player.setWings(w.id, w.look);
    if (t) this.trail.setTrail(t.id, t.look);
  }

  /** The ability chosen on the menu (falls back to Flight Burst if not unlocked). */
  private selectedAbility(): AbilityId {
    const id = ABILITY_ORDER[this.save.data.selectedAbility] ?? 'flight';
    return isUnlocked(id, this.save.data.ascendedBestDistance) ? id : 'flight';
  }

  private setMap(map: WorldMap): void {
    this.env.setMap(map);
    this.obstacles.map = map;
    this.coins.map = map;
    this.pickups.map = map;
  }

  private useAbility(): void {
    if (this.state.state === GameState.AscendedRun) this.session.useAbility();
  }

  /** The endless Ascended State (Decisions log #20-23). */
  private startAscended(): void {
    if (!this.state.canGo(GameState.AscendedRun)) return;
    const ability = this.selectedAbility();
    this.session = new RunSession((Date.now() ^ (Math.random() * 1e9)) >>> 0, { ability, abilityLevel: this.shop.upgradeLevel(ability) }, ASCENDED_MAP);
    this.setMap(ASCENDED_MAP);
    this.player.reset();
    this.crumble.stop();
    this.endTimer = 0;
    this.gateFlashed = true;
    this.hud.setMode('ascended');
    this.hud.setChaser('YOUR LIGHT');
    this.hud.setWhiteout(0);
    this.hud.setMultiplier(1);
    this.hud.setStage(this.session.stage.name);
    this.hud.setHeaven(true);
    this.screens.hideAll();
    this.state.go(GameState.AscendedRun);
    this.hud.toast('FREE TO ROAM', 1.8, this.session.stage.name);
  }

  /** For play-testing: add ?stage=gardens (or stairway, gate, bridges, kingdom) to the link to start there. */
  private testStart(): RunStart | null {
    const id = new URLSearchParams(location.search).get('stage') as ThemeId | null;
    if (!id || !STAGES.some((s) => s.id === id) || id === 'hell') return null;
    return { distance: stageStart(id) };
  }

  private startRun(start: RunStart): void {
    const begin = start.distance === undefined ? this.testStart() ?? start : start;
    const d = begin.distance ?? 0;
    const target = stageAtState(d);
    if (!this.state.canGo(target)) return;
    // new seed every run, so the course is never the same twice
    this.session = new RunSession((Date.now() ^ (Math.random() * 1e9)) >>> 0, begin);
    this.setMap(JOURNEY_MAP);
    this.hud.setMode('journey');
    this.player.reset();
    this.crumble.stop();
    this.endTimer = 0;
    this.gateFlashed = d > GATE_Z;
    this.hud.setChaser(this.session.chaser === 'shadow' ? 'YOUR SINS' : 'THE DEVIL');
    this.hud.setWhiteout(0);
    this.shadow.setSin(this.session.moral.sin);
    this.pickups.setHeaven(this.session.stage.id !== 'hell');
    this.screens.hideAll();
    this.state.go(target);
    this.runCount++;
    const stage = this.session.stage;
    this.hud.setStage(stage.name);
    this.hud.setHeaven(stage.id !== 'hell');
    if (d > 0) this.hud.toast(stage.level ? `LEVEL ${stage.level}` : stage.name.toUpperCase(), 2, stage.level ? stage.name : '');
    else this.hud.toast('RUN!', 0.9);
    if (this.runCount === 1 && this.save.data.runs < 3 && d === 0) {
      this.hud.hint('Swipe ← → ↑ ↓ to escape the Devil');
      setTimeout(() => this.hud.hint(null), 4000);
    }
  }

  private pause(): void {
    if (this.state.pause()) this.screens.showPause(this.session.stage.id !== 'hell');
  }

  private resume(): void {
    if (this.state.resume()) {
      this.screens.hideAll();
      this.last = performance.now();
    }
  }

  private toMenu(): void {
    if (this.state.go(GameState.MainMenu)) {
      this.session = new RunSession(1);
      this.setMap(JOURNEY_MAP);
      this.player.reset();
      this.crumble.stop();
      this.showMenu();
    }
  }

  private resize(): void {
    const w = this.mount.clientWidth || window.innerWidth;
    const h = this.mount.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    // keep all three lanes in view on narrow (portrait) screens
    const hFov = THREE.MathUtils.degToRad(CONFIG.camera.horizontalFovDeg);
    const vFov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hFov / 2) / aspect));
    this.camera.fov = THREE.MathUtils.clamp(vFov, CONFIG.camera.minVerticalFovDeg, 92);
    this.camera.updateProjectionMatrix();
  }

  private frame = (now: number): void => {
    requestAnimationFrame(this.frame);
    const dt = Math.min(CONFIG.maxDeltaTime, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    try {
      this.tick(dt);
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('game-error', { detail: err }));
    }
  };

  private handleEvents(): void {
    const s = this.session;
    for (const e of s.drainEvents()) {
      switch (e.type) {
        case 'stumble':
          this.player.stumble();
          this.shake = 0.35;
          navigator.vibrate?.(60);
          if (!s.ended) {
            const close = s.devil.danger > 0.6;
            const warn = s.chaser === 'none' ? 'YOUR LIGHT IS FADING!' : s.chaser === 'shadow' ? 'YOUR SINS ARE CLOSE!' : 'HE IS CLOSE!';
            this.hud.toast(close ? warn : 'STUMBLE!', 0.8);
            if (s.ascended) this.hud.setMultiplier(1);
          }
          break;
        case 'end':
          this.shake = 0.6;
          navigator.vibrate?.([80, 40, 160]);
          this.endTimer = END_DELAY;
          // from the Stairway on, the Shadow drags you down and the floor gives way (Decisions log #15)
          if (e.reason === 'caught' && s.chaser === 'shadow') {
            this.endTimer = END_DELAY + 0.5;
            this.crumble.start(s.motion.x, this.floorMaterial());
          }
          break;
        case 'devilGivesUp':
          this.shake = 0.8;
          navigator.vibrate?.([40, 30, 40]);
          this.hud.toast('YOU ESCAPED THE DEVIL', 2.8, 'But your sins still follow you…');
          this.hud.setChaser('YOUR SINS');
          break;
        case 'stage':
          this.hud.setStage(e.stage.name);
          this.hud.setHeaven(e.stage.id !== 'hell');
          if (e.stage.state !== this.state.state) this.state.go(e.stage.state);
          if (s.ascended) this.hud.toast(e.stage.name.toUpperCase(), 2.2);
          else if (e.stage.level) this.hud.toast(`LEVEL ${e.stage.level}`, 2.4, e.stage.name);
          else if (e.stage.id === 'stairway') this.hud.toast('THE STAIRWAY', 2.4, 'Climb to Heaven');
          else if (e.stage.id === 'gate') this.hud.toast("HEAVEN'S GATE", 2.4);
          else if (e.stage.id === 'god') this.hud.toast('THE LIGHT OF GOD', 2.6, 'Your sins cannot follow you here');
          this.pickups.setHeaven(e.stage.id !== 'hell');
          break;
        case 'checkpoint':
          this.save.setCheckpoint(stageStart('gate'), s.score.coins, s.moral.record);
          break;
        case 'soulHelped':
          this.hud.pop('+ GRACE · Soul saved', 'grace');
          navigator.vibrate?.(20);
          break;
        case 'soulLost':
          this.hud.pop('A lost soul was left behind', 'info');
          break;
        case 'temptationTaken':
          this.hud.pop(`+ SIN · +${e.coins} coins`, 'sin');
          this.shadow.setSin(s.moral.sin);
          navigator.vibrate?.([30, 30, 30]);
          break;
        case 'resisted':
          this.hud.pop('Temptation resisted · + GRACE', 'grace');
          break;
        case 'miracle':
          this.hud.toast('MIRACLE SHIELD', 1.6, 'Protects you from one hit');
          break;
        case 'shieldUsed':
          this.shake = 0.25;
          this.hud.pop('The Miracle saved you!', 'grace');
          break;
        case 'levelComplete':
          this.hud.toast('LEVEL COMPLETE', 1.8, `+${e.bonus} points`);
          break;
        case 'multiplier':
          this.hud.setMultiplier(e.value);
          this.hud.pop(`x${e.value} MULTIPLIER`, 'grace');
          break;
        case 'abilityReady':
          this.hud.pop(`${ABILITIES[s.ability?.selected ?? 'flight'].name} ready · tap ✦`, 'grace');
          navigator.vibrate?.(30);
          break;
        case 'abilityStart':
          this.hud.toast(ABILITIES[e.id].name.toUpperCase(), 1.2);
          break;
        case 'journeyComplete':
          this.hud.flash();
          this.endTimer = GOD_DELAY;
          break;
      }
    }
    // white flash as you pass through the gates
    if (!this.gateFlashed && !s.ascended && s.distance > GATE_Z) {
      this.gateFlashed = true;
      this.hud.flash();
      setTimeout(() => this.hud.toast('CHECKPOINT', 1.6, 'You can restart here'), 900);
    }
  }

  private tick(dt: number): void {
    const s = this.session;
    const running = this.state.isRunning;
    const paused = this.state.state === GameState.Paused;

    if (running && !s.over) {
      // Slow Motion slows the world; ability timers use real time
      s.update(dt * s.timeScale, dt);
      this.handleEvents();
    } else if (running && s.over) {
      this.endTimer -= dt;
      if (this.endTimer <= 0) this.finishRun();
    }

    const vdt = paused ? 0 : dt * s.timeScale;
    const speed = running && !s.over ? s.speed : 0;
    const map = s.map;
    const g0 = map.ground(s.distance);
    this.env.update(vdt, s.distance, speed);
    this.renderer.toneMappingExposure = this.env.exposure;
    this.obstacles.sync(s.obstacles, s.distance, vdt);
    this.coins.sync(s.coins, s.distance, vdt);
    this.pickups.sync(s.pickups, s.distance, vdt);
    this.player.setShield(s.shield, s.protectedNow && !s.shield, s.time);
    // walking into God's light: the screen slowly fills with white
    const god = s.stage.id === 'god';
    if (running || paused) {
      const godT = god ? Math.min(1, (s.distance - stageStart('god')) / STAGES[STAGES.length - 1].length) : 0;
      this.hud.setWhiteout(s.completed ? 1 : godT * 0.8);
      this.hud.setGrace(s.moral.percent, s.moral.choices);
      this.hud.showChase(!god);
      if (s.ability) this.hud.setAbility(ABILITIES[s.ability.selected].name.split(' ')[0].toUpperCase(), s.ability.charge, s.ability.ready, s.ability.active !== null);
    }
    const shadowCaught = s.ended === 'caught' && s.chaser === 'shadow';
    this.player.fly = s.flyY;
    this.player.update(vdt, s.motion, running ? s.speed : 0, shadowCaught ? 'fall' : s.ended);
    const groundAt = (dz: number) => map.ground(s.distance - dz) - g0;
    const devilChasing = s.chaser === 'devil';
    // the Devil only appears during a run (not behind the menus)
    const devilShown = devilChasing && (running || paused || this.state.state === GameState.GameOver);
    this.devil.update(vdt, devilShown ? s.devil.gap : 1e3, s.motion.x, devilShown && s.devil.caught, groundAt);
    this.shadow.update(vdt, s.chaser === 'shadow' && !god, s.devil.gap, s.motion.x, shadowCaught, groundAt);
    this.crumble.update(vdt);
    this.trail.update(vdt, s.motion.x, s.motion.y + s.flyY, speed, running && !s.over);
    if (running || paused) {
      this.hud.update(vdt, s.score.score, s.distance, s.score.coins, s.devil.danger, map.progress(s.distance));
    }

    // follow camera (looks up the stairs as you climb)
    this.camX = THREE.MathUtils.lerp(this.camX, s.motion.x * 0.55, Math.min(1, dt * 8));
    this.shake = Math.max(0, this.shake - dt);
    const sh = this.shake * 0.4;
    // flying lifts the camera a little too
    const ahead = map.ground(s.distance + CONFIG.camera.lookAhead) - g0 + s.flyY * 0.5;
    this.camera.position.set(
      this.camX + (Math.random() - 0.5) * sh,
      CONFIG.camera.height + ahead * 0.55 + s.motion.y * 0.35 + (Math.random() - 0.5) * sh,
      CONFIG.camera.distance,
    );
    this.camera.lookAt(this.camX * 0.6, 1.2 + ahead * 0.75 + s.motion.y * 0.2, -CONFIG.camera.lookAhead);
    if (this.shopScreen?.isOpen) {
      // shop: close-up of the runner (from behind, so wings and trail show) in the lower part of the screen
      this.camera.position.set(1.5, 1.6, 5.2);
      this.camera.lookAt(0, 3.6, 0);
    }
    this.renderer.render(this.scene, this.camera);
  }

  /** The floor material of the current world (for the crumbling pieces). */
  private floorMaterial(): THREE.Material {
    switch (this.session.stage.id) {
      case 'gardens': return MATERIALS.garden;
      case 'bridges': return MATERIALS.bridge;
      case 'kingdom': return MATERIALS.goldTiles;
      case 'cosmic': return MATERIALS.cosmicFloor;
      default: return MATERIALS.marble;
    }
  }

  private finishRun(): void {
    const s = this.session;
    if (s.completed) {
      // God's judgment (Decisions log #17, #19)
      const j = judge(s.moral.record);
      this.save.recordRun(s.score.score, s.distance, s.score.coins);
      this.save.data.journeysCompleted += 1;
      this.save.recordJudgment(j.percent, j.passed, j.verdict === 'perfect', j.rewardCoins);
      if (this.state.go(GameState.Judgment)) this.screens.showJudgment(j, s.moral.record);
      return;
    }
    if (!s.ended) return;
    if (s.ascended) {
      // the competitive score (Decisions log #23)
      const unlockAt = Object.fromEntries(ABILITY_ORDER.map((id) => [id, ABILITIES[id].unlockDistance]));
      const r = this.save.recordAscended(s.score.score, s.distance, s.score.coins, unlockAt);
      this.state.go(GameState.GameOver);
      this.screens.showGameOver({
        reason: s.ended, chaser: s.chaser, inHeaven: true, score: s.score.score, distance: s.distance, coins: s.score.coins,
        best: this.save.data.ascendedBestScore, isNewBest: r.isBest, canContinue: false,
        ascended: { top: this.save.data.ascendedTop, rank: r.rank, bestMultiplier: s.score.bestMultiplier, unlocked: r.unlocked.map((id) => ABILITIES[id as AbilityId].name) },
      });
      // only Ascended scores go online (the competitive score)
      this.submitAscended(s.score.score, s.distance, s.score.coins, s.time);
      return;
    }
    const isBest = this.save.recordRun(s.score.score, s.distance, s.score.coins);
    const afterGate = s.distance > stageStart('gardens') && this.save.data.checkpoint > 0;
    this.state.go(GameState.GameOver);
    this.screens.showGameOver({
      reason: s.ended,
      chaser: s.chaser,
      inHeaven: s.stage.id !== 'hell',
      score: s.score.score,
      distance: s.distance,
      coins: s.score.coins,
      best: this.save.data.bestScore,
      isNewBest: isBest,
      canContinue: afterGate,
    });
  }
}

function stageAtState(d: number): GameState {
  let st = GameState.HellRun;
  for (const s of STAGES) if (d >= stageStart(s.id)) st = s.state;
  return st;
}
