import { CONFIG } from '../core/config';
import type { Chaser, EndReason } from '../core/RunSession';
import type { Judgment, MoralRecord } from '../systems/SinGrace';

export interface ScreenHandlers {
  onPlay: () => void; // new journey from Hell
  onContinue: () => void; // from the Heaven's Gate checkpoint
  onResume: () => void;
  onMenu: () => void;
  onAscend: () => void; // passed judgment
  onReturnToHell: () => void; // failed judgment
}

export interface GameOverInfo {
  reason: EndReason;
  chaser: Chaser;
  inHeaven: boolean;
  score: number;
  distance: number;
  coins: number;
  best: number;
  isNewBest: boolean;
  canContinue: boolean; // crashed after Heaven's Gate
}

function reasonText(reason: EndReason, inHeaven: boolean, chaser: Chaser): string {
  if (reason === 'caught') return chaser === 'shadow' ? 'Your sins dragged you down!' : 'The Devil caught you!';
  if (reason === 'crash') return 'You crashed!';
  return inHeaven ? 'You fell back toward Hell!' : 'You fell into the lava!';
}

/** Main menu, pause, game-over and "reached God" screens (simple HTML over the 3D view). */
export class Screens {
  private menu: HTMLDivElement;
  private pause: HTMLDivElement;
  private over: HTMLDivElement;
  private god: HTMLDivElement;
  private ascended: HTMLDivElement;
  private handlers: ScreenHandlers;

  constructor(root: HTMLElement, h: ScreenHandlers) {
    this.handlers = h;
    this.menu = this.make(root, `
      <div class="title">HEAVEN<span class="amp">&amp;</span>HELL</div>
      <div class="tagline">Escape Hell. Climb to Heaven. Face Judgment.<br/>Earn Freedom. Compete for Eternity.</div>
      <button class="big-btn" data-continue>CONTINUE</button>
      <div class="sub" data-continue-note style="margin-top:8px">from Heaven's Gate</div>
      <button class="big-btn" data-play>RUN</button>
      <div class="best" data-best></div>
      <div class="how">Swipe ← → to change lanes<br/>Swipe ↑ to jump · Swipe ↓ to slide<br/>3 stumbles close together and you're caught<br/>Escape the Devil and climb to Heaven</div>`);
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
    this.god = this.make(root, '');
    this.god.classList.add('judgment');
    this.ascended = this.make(root, `
      <div class="god-title">The Ascended State</div>
      <div class="god-text">You are free to roam.<br/><br/>Endless mode, abilities and the leaderboards arrive in the next update (Phase 4).</div>
      <button class="big-btn" data-menu>MENU</button>`);
    this.ascended.classList.add('heaven');

    const bind = (el: HTMLElement, sel: string, fn: () => void) =>
      el.querySelectorAll(sel).forEach((b) => b.addEventListener('click', fn));
    bind(this.menu, '[data-play]', h.onPlay);
    bind(this.menu, '[data-continue]', h.onContinue);
    bind(this.over, '[data-again]', h.onPlay);
    bind(this.over, '[data-continue]', h.onContinue);
    bind(this.pause, '[data-resume]', h.onResume);
    bind(this.pause, '[data-menu]', h.onMenu);
    bind(this.over, '[data-menu]', h.onMenu);
    bind(this.ascended, '[data-menu]', h.onMenu);
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
    for (const s of [this.menu, this.pause, this.over, this.god, this.ascended]) s.classList.remove('on');
  }

  showMenu(best: number, hasCheckpoint: boolean, ascended = false): void {
    this.hideAll();
    let badge = this.menu.querySelector('.ascended-badge') as HTMLElement | null;
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'ascended-badge';
      this.q(this.menu, '.tagline').after(badge);
    }
    badge.textContent = ascended ? '✦ ASCENDED · FREE TO ROAM ✦' : '';
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
    this.q(this.over, '[data-reason]').textContent = reasonText(i.reason, i.inHeaven, i.chaser);
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

  /**
   * God's judgment (Decisions log #5, #17): words of light, your journey counted up line by line,
   * then the verdict and exactly why.
   */
  showJudgment(j: Judgment, r: MoralRecord): void {
    this.hideAll();
    const met = (a: number, b: number) => `${a} / ${a + b}`;
    const pass = CONFIG.judgment.pass;
    let t = 0;
    const at = (gap: number) => `style="animation-delay:${(t += gap).toFixed(1)}s"`;
    const verdictWords = j.passed ? 'You are free to roam.' : 'You are not yet ready.';
    // built in screen order, so each line appears after the one above it
    const reward = () =>
      j.passed
        ? `<div class="j-reward j-step" ${at(0.6)}>+${j.rewardCoins} coins${j.verdict === 'perfect' ? ' · PERFECT JUDGMENT' : j.verdict === 'extra' ? ' · BLESSED' : ''}</div>
           <div class="j-reward j-step" ${at(0.5)}>✦ The Ascended State is unlocked ✦</div>`
        : '';
    this.god.innerHTML = `
      <div class="voice j-step" ${at(0.3)}>I have watched your journey.</div>
      <div class="j-stats j-step" ${at(1.3)}>
        <span>Lost souls helped</span><b>${met(r.soulsHelped, r.soulsMissed)}</b>
        <span>Temptations resisted</span><b>${met(r.temptationsResisted, r.temptationsTaken)}</b>
        <span>Miracles gathered</span><b>${r.miracles}</b>
      </div>
      <div class="j-grace j-step" ${at(1.0)}>GRACE ${j.percent}%</div>
      <div class="j-bar j-step" ${at(0)}>
        <div class="j-bar-fill" style="width:${j.percent}%"></div>
        <i style="left:${pass}%"></i><span style="left:${pass}%">${pass}% to pass</span>
      </div>
      <div class="j-verdict j-step ${j.passed ? '' : 'fail'}" ${at(1.2)}><div class="voice">${verdictWords}</div></div>
      <div class="j-reasons j-step" ${at(0.7)}>${j.reasons.map((x) => `<div>${x}</div>`).join('')}</div>
      ${reward()}
      <div class="j-step" ${at(0.6)}>
        ${j.passed ? '<button class="big-btn" data-ascend>ENTER THE ASCENDED STATE</button>' : '<button class="big-btn" data-hell>RETURN TO HELL</button><div class="sub" style="margin-top:8px;color:#5a4020">Every journey is a new course</div>'}
      </div>`;
    this.god.querySelector('[data-ascend]')?.addEventListener('click', this.handlers.onAscend);
    this.god.querySelector('[data-hell]')?.addEventListener('click', this.handlers.onReturnToHell);
    this.god.scrollTop = 0;
    // tap anywhere to show everything at once
    this.god.classList.remove('skip');
    this.god.onclick = () => this.god.classList.add('skip');
    this.god.classList.add('on');
  }

  showAscended(): void {
    this.hideAll();
    this.ascended.classList.add('on');
  }

}
