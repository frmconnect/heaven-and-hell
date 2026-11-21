import type { EndReason } from '../core/RunSession';

export interface ScreenHandlers {
  onPlay: () => void; // new journey from Hell
  onContinue: () => void; // from the Heaven's Gate checkpoint
  onResume: () => void;
  onMenu: () => void;
}

export interface GameOverInfo {
  reason: EndReason;
  inHeaven: boolean;
  score: number;
  distance: number;
  coins: number;
  best: number;
  isNewBest: boolean;
  canContinue: boolean; // crashed after Heaven's Gate
}

function reasonText(reason: EndReason, inHeaven: boolean): string {
  if (reason === 'caught') return 'The Devil caught you!';
  if (reason === 'crash') return 'You crashed!';
  return inHeaven ? 'You fell back toward Hell!' : 'You fell into the lava!';
}

/** Main menu, pause, game-over and "reached God" screens (simple HTML over the 3D view). */
export class Screens {
  private menu: HTMLDivElement;
  private pause: HTMLDivElement;
  private over: HTMLDivElement;
  private god: HTMLDivElement;

  constructor(root: HTMLElement, h: ScreenHandlers) {
    this.menu = this.make(root, `
      <div class="title">HEAVEN<span class="amp">&amp;</span>HELL</div>
      <div class="tagline">Escape Hell. Climb to Heaven. Face Judgment.<br/>Earn Freedom. Compete for Eternity.</div>
      <button class="big-btn" data-continue>CONTINUE</button>
      <div class="sub" data-continue-note style="margin-top:8px">from Heaven's Gate</div>
      <button class="big-btn" data-play>RUN</button>
      <div class="best" data-best></div>
      <div class="how">Swipe ← → to change lanes<br/>Swipe ↑ to jump · Swipe ↓ to slide<br/>Escape the Devil and climb to Heaven</div>`);
    this.pause = this.make(root, `
      <div class="go-reason">Paused</div>
      <button class="big-btn" data-resume>RESUME</button>
      <button class="ghost-btn" data-menu>MENU</button>`);
    this.over = this.make(root, `
      <div class="go-reason" data-reason></div>
      <div class="stats">
        <span>Score</span><b data-s></b>
        <span>Distance</span><b data-d></b>
        <span>Coins</span><b data-c></b>
        <span>Best</span><b data-b></b>
      </div>
      <div class="new-best" data-new>NEW BEST!</div>
      <button class="big-btn" data-continue>TRY AGAIN</button>
      <div class="sub" style="margin-top:8px" data-continue-note>from Heaven's Gate</div>
      <button class="big-btn" data-again>RUN AGAIN</button>
      <button class="ghost-btn" data-menu>MENU</button>`);
    this.god = this.make(root, `
      <div class="god-title">You have reached God</div>
      <div class="god-text">A blinding light surrounds you. Your journey is complete…<br/><br/>Judgment comes in the next update (Phase 3).</div>
      <div class="stats">
        <span>Score</span><b data-s></b>
        <span>Coins</span><b data-c></b>
      </div>
      <button class="big-btn" data-menu>MENU</button>`);
    this.god.classList.add('heaven');

    const bind = (el: HTMLElement, sel: string, fn: () => void) =>
      el.querySelectorAll(sel).forEach((b) => b.addEventListener('click', fn));
    bind(this.menu, '[data-play]', h.onPlay);
    bind(this.menu, '[data-continue]', h.onContinue);
    bind(this.over, '[data-again]', h.onPlay);
    bind(this.over, '[data-continue]', h.onContinue);
    bind(this.pause, '[data-resume]', h.onResume);
    bind(this.pause, '[data-menu]', h.onMenu);
    bind(this.over, '[data-menu]', h.onMenu);
    bind(this.god, '[data-menu]', h.onMenu);
  }

  private make(root: HTMLElement, html: string): HTMLDivElement {
    const d = document.createElement('div');
    d.className = 'screen';
    d.innerHTML = html;
    // taps on menus shouldn't reach the game's swipe handler
    d.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    root.appendChild(d);
    return d;
  }

  private q(el: HTMLElement, sel: string): HTMLElement {
    return el.querySelector(sel) as HTMLElement;
  }

  hideAll(): void {
    for (const s of [this.menu, this.pause, this.over, this.god]) s.classList.remove('on');
  }

  showMenu(best: number, hasCheckpoint: boolean): void {
    this.hideAll();
    this.q(this.menu, '[data-best]').textContent = best > 0 ? `Best score: ${best}` : '';
    this.q(this.menu, '[data-continue]').style.display = hasCheckpoint ? '' : 'none';
    this.q(this.menu, '[data-continue-note]').style.display = hasCheckpoint ? '' : 'none';
    const play = this.q(this.menu, '[data-play]');
    play.textContent = hasCheckpoint ? 'NEW JOURNEY' : 'RUN';
    play.className = hasCheckpoint ? 'ghost-btn' : 'big-btn';
    this.menu.classList.add('on');
  }

  showPause(inHeaven: boolean): void {
    this.hideAll();
    this.pause.classList.toggle('heaven', inHeaven);
    this.pause.classList.add('on');
  }

  showGameOver(i: GameOverInfo): void {
    this.hideAll();
    this.over.classList.toggle('heaven', i.inHeaven);
    this.q(this.over, '[data-reason]').textContent = reasonText(i.reason, i.inHeaven);
    this.q(this.over, '[data-s]').textContent = String(i.score);
    this.q(this.over, '[data-d]').textContent = `${Math.floor(i.distance)} m`;
    this.q(this.over, '[data-c]').textContent = String(i.coins);
    this.q(this.over, '[data-b]').textContent = String(i.best);
    this.q(this.over, '[data-new]').style.display = i.isNewBest ? 'block' : 'none';
    // after Heaven's Gate you restart at the Gate (Decisions log #12)
    this.q(this.over, '[data-continue]').style.display = i.canContinue ? '' : 'none';
    this.q(this.over, '[data-continue-note]').style.display = i.canContinue ? '' : 'none';
    const again = this.q(this.over, '[data-again]');
    again.textContent = i.canContinue ? 'NEW JOURNEY' : 'RUN AGAIN';
    again.className = i.canContinue ? 'ghost-btn' : 'big-btn';
    this.over.classList.add('on');
  }

  showGodReached(score: number, coins: number): void {
    this.hideAll();
    this.q(this.god, '[data-s]').textContent = String(score);
    this.q(this.god, '[data-c]').textContent = String(coins);
    this.god.classList.add('on');
  }
}
