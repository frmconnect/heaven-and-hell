import * as THREE from 'three';
import { CONFIG } from './config';
import { GameState, GameStateManager } from './GameStateManager';
import { RunSession } from './RunSession';
import { DevilAvatar } from '../enemies/DevilAvatar';
import { InputController } from '../input/InputController';
import { PlayerAvatar } from '../player/PlayerAvatar';
import { SaveData } from '../systems/SaveData';
import { HUD } from '../ui/HUD';
import { Screens } from '../ui/Screens';
import { CoinRenderer } from '../world/CoinRenderer';
import { HellEnvironment } from '../world/hell/HellEnvironment';
import { ObstacleRenderer } from '../world/ObstacleRenderer';

const END_DELAY = 1.1; // seconds of "caught!" animation before the game-over screen

/** Connects everything: state, rules (RunSession), 3D drawing, input and UI. */
export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
  private state = new GameStateManager();
  private save = new SaveData();
  private env: HellEnvironment;
  private obstacles: ObstacleRenderer;
  private coins: CoinRenderer;
  private player: PlayerAvatar;
  private devil: DevilAvatar;
  private hud: HUD;
  private screens: Screens;
  private session: RunSession;
  private endTimer = 0;
  private shake = 0;
  private camX = 0;
  private last = performance.now();
  private runCount = 0;

  constructor(private mount: HTMLElement, uiRoot: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    mount.appendChild(this.renderer.domElement);

    this.env = new HellEnvironment(this.scene);
    this.obstacles = new ObstacleRenderer(this.scene);
    this.coins = new CoinRenderer(this.scene);
    this.player = new PlayerAvatar(this.scene);
    this.devil = new DevilAvatar(this.scene);
    this.session = new RunSession(1);

    this.hud = new HUD(uiRoot, () => this.pause());
    this.screens = new Screens(uiRoot, {
      onPlay: () => this.startRun(),
      onResume: () => this.resume(),
      onMenu: () => this.toMenu(),
    });

    const input = new InputController(mount);
    input.onAction((a) => {
      if (this.state.state === GameState.HellRun) this.session.act(a);
    });

    this.state.onChange((to) => {
      this.hud.show(to === GameState.HellRun || to === GameState.Paused);
    });

    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
    });
    this.resize();
    this.screens.showMenu(this.save.data.bestScore);
    requestAnimationFrame(this.frame);
  }

  private startRun(): void {
    if (!this.state.canGo(GameState.HellRun)) return;
    // new seed every run, so the course is never the same twice
    this.session = new RunSession((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    this.player.reset();
    this.endTimer = 0;
    this.screens.hideAll();
    this.state.go(GameState.HellRun);
    this.runCount++;
    this.hud.toast('RUN!', 0.9);
    if (this.runCount === 1 && this.save.data.runs < 3) {
      this.hud.hint('Swipe ← → ↑ ↓ to escape the Devil');
      setTimeout(() => this.hud.hint(null), 4000);
    }
  }

  private pause(): void {
    if (this.state.pause()) this.screens.showPause();
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
      this.player.reset();
      this.screens.showMenu(this.save.data.bestScore);
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

  private tick(dt: number): void {
    const s = this.session;
    const running = this.state.state === GameState.HellRun;
    const paused = this.state.state === GameState.Paused;

    if (running && !s.ended) {
      s.update(dt);
      for (const e of s.drainEvents()) {
        if (e.type === 'stumble') {
          this.player.stumble();
          this.shake = 0.35;
          navigator.vibrate?.(60);
          if (!s.ended) this.hud.toast(s.devil.danger > 0.6 ? 'HE IS CLOSE!' : 'STUMBLE!', 0.8);
        } else if (e.type === 'end') {
          this.shake = 0.6;
          navigator.vibrate?.([80, 40, 160]);
          this.endTimer = END_DELAY;
        }
      }
    } else if (running && s.ended) {
      this.endTimer -= dt;
      if (this.endTimer <= 0) this.finishRun();
    }

    const vdt = paused ? 0 : dt;
    const speed = running && !s.ended ? s.speed : 0;
    this.env.update(vdt, s.distance, speed);
    this.obstacles.sync(s.obstacles, s.distance, vdt);
    this.coins.sync(s.coins, s.distance, vdt);
    this.player.update(vdt, s.motion, running ? s.speed : 0, s.ended);
    this.devil.update(vdt, s.devil.gap, s.motion.x, s.devil.caught);
    if (running || paused) this.hud.update(vdt, s.score.score, s.distance, s.score.coins, s.devil.danger);

    // follow camera
    this.camX = THREE.MathUtils.lerp(this.camX, s.motion.x * 0.55, Math.min(1, dt * 8));
    this.shake = Math.max(0, this.shake - dt);
    const sh = this.shake * 0.4;
    this.camera.position.set(
      this.camX + (Math.random() - 0.5) * sh,
      CONFIG.camera.height + s.motion.y * 0.35 + (Math.random() - 0.5) * sh,
      CONFIG.camera.distance,
    );
    this.camera.lookAt(this.camX * 0.6, 1.2 + s.motion.y * 0.2, -CONFIG.camera.lookAhead);
    this.renderer.render(this.scene, this.camera);
  }

  private finishRun(): void {
    const s = this.session;
    if (!s.ended) return;
    const isBest = this.save.recordRun(s.score.score, s.distance, s.score.coins);
    this.state.go(GameState.GameOver);
    this.screens.showGameOver(s.ended, s.score.score, s.distance, s.score.coins, this.save.data.bestScore, isBest);
  }
}
