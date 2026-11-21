import type { EndReason } from '../core/RunSession';

export interface ScreenHandlers {
  onPlay: () => void;
  onResume: () => void;
  onMenu: () => void;
}

const REASONS: Record<EndReason, string> = {
  caught: 'The Devil caught you!',
  crash: 'You crashed!',
  fall: 'You fell into the lava!',
};

/** Main menu, pause and game-over screens (simple HTML over the 3D view). */
export class Screens {
  private menu: HTMLDivElement;
  private pause: HTMLDivElement;
  private over: HTMLDivElement;

  constructor(root: HTMLElement, h: ScreenHandlers) {
    this.menu = this.make(root, `
      <div class="title">HEAVEN<span class="amp">&amp;</span>HELL</div>
      <div class="tagline">Escape Hell. Climb to Heaven. Face Judgment.<br/>Earn Freedom. Compete for Eternity.</div>
      <button class="big-btn" data-play>RUN</button>
      <div class="best" data-best></div>
      <div class="how">Swipe ← → to change lanes<br/>Swipe ↑ to jump · Swipe ↓ to slide<br/>Don't let the Devil catch you</div>`);
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
      <button class="big-btn" data-again>RUN AGAIN</button>
      <button class="ghost-btn" data-menu>MENU</button>`);

    const bind = (el: HTMLElement, sel: string, fn: () => void) =>
      el.querySelectorAll(sel).forEach((b) => b.addEventListener('click', fn));
    bind(this.menu, '[data-play]', h.onPlay);
    bind(this.over, '[data-again]', h.onPlay);
    bind(this.pause, '[data-resume]', h.onResume);
    bind(this.pause, '[data-menu]', h.onMenu);
    bind(this.over, '[data-menu]', h.onMenu);
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

  hideAll(): void {
    for (const s of [this.menu, this.pause, this.over]) s.classList.remove('on');
  }

  showMenu(best: number): void {
    this.hideAll();
    (this.menu.querySelector('[data-best]') as HTMLElement).textContent = best > 0 ? `Best score: ${best}` : '';
    this.menu.classList.add('on');
  }

  showPause(): void {
    this.hideAll();
    this.pause.classList.add('on');
  }

  showGameOver(reason: EndReason, score: number, distance: number, coins: number, best: number, isNewBest: boolean): void {
    this.hideAll();
    const set = (sel: string, v: string) => ((this.over.querySelector(sel) as HTMLElement).textContent = v);
    set('[data-reason]', REASONS[reason]);
    set('[data-s]', String(score));
    set('[data-d]', `${Math.floor(distance)} m`);
    set('[data-c]', String(coins));
    set('[data-b]', String(best));
    (this.over.querySelector('[data-new]') as HTMLElement).style.display = isNewBest ? 'block' : 'none';
    this.over.classList.add('on');
  }
}
