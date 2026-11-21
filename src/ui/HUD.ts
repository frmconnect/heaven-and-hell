import { STAGES, stageStart, JOURNEY_LENGTH } from '../world/journey';

/** The in-run display: score, distance, coins, Devil meter, journey progress, pause button, and short messages. */
export class HUD {
  readonly el: HTMLDivElement;
  private scoreEl: HTMLElement;
  private distEl: HTMLElement;
  private coinsEl: HTMLElement;
  private devilEl: HTMLElement;
  private devilFill: HTMLElement;
  private toastEl: HTMLElement;
  private toastSub: HTMLElement;
  private hintEl: HTMLElement;
  private vignette: HTMLElement;
  private flashEl: HTMLElement;
  private journeyFill: HTMLElement;
  private journeyMark: HTMLElement;
  private stageEl: HTMLElement;
  private toastTimer = 0;

  constructor(root: HTMLElement, onPause: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'hud';
    // little ticks on the journey bar where each stage starts
    const ticks = STAGES.slice(1)
      .filter((s) => s.id !== 'gate')
      .map((s) => `<i style="left:${((stageStart(s.id) / JOURNEY_LENGTH) * 100).toFixed(1)}%"></i>`)
      .join('');
    this.el.innerHTML = `
      <div class="vignette"></div>
      <div class="flash"></div>
      <div class="hud-row">
        <div><div class="score" data-score>0</div><div class="sub" data-dist>0 m</div></div>
        <div style="display:flex;gap:10px;align-items:center">
          <div class="coins"><span class="coin-dot"></span><span data-coins>0</span></div>
          <button class="icon-btn" data-pause aria-label="Pause">II</button>
        </div>
      </div>
      <div class="journey">
        <div class="journey-label" data-stage>HELL</div>
        <div class="journey-bar"><div class="journey-fill" data-jfill></div>${ticks}<b class="journey-mark" data-jmark></b><span class="journey-god">✦</span></div>
      </div>
      <div class="devil-meter" data-devil>THE DEVIL<div class="devil-bar"><div class="devil-fill" data-devil-fill></div></div></div>
      <div class="toast" data-toast><div data-toast-main></div><div class="toast-sub" data-toast-sub></div></div>
      <div class="hint" data-hint></div>`;
    root.appendChild(this.el);
    const q = (s: string) => this.el.querySelector(s) as HTMLElement;
    this.scoreEl = q('[data-score]');
    this.distEl = q('[data-dist]');
    this.coinsEl = q('[data-coins]');
    this.devilEl = q('[data-devil]');
    this.devilFill = q('[data-devil-fill]');
    this.toastEl = q('[data-toast]');
    this.toastSub = q('[data-toast-sub]');
    this.hintEl = q('[data-hint]');
    this.vignette = q('.vignette');
    this.flashEl = q('.flash');
    this.journeyFill = q('[data-jfill]');
    this.journeyMark = q('[data-jmark]');
    this.stageEl = q('[data-stage]');
    const pause = q('[data-pause]');
    pause.addEventListener('click', onPause);
    // stop the pause tap from also counting as a swipe/tap on the game
    pause.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  }

  show(on: boolean): void {
    this.el.classList.toggle('on', on);
  }

  /** Switch the colour scheme between Hell (fiery) and Heaven (light and gold). */
  setHeaven(on: boolean): void {
    this.el.classList.toggle('heaven', on);
  }

  setStage(name: string): void {
    this.stageEl.textContent = name.toUpperCase();
  }

  update(dt: number, score: number, distance: number, coins: number, danger: number, devilActive: boolean, progress: number): void {
    this.scoreEl.textContent = String(score);
    this.distEl.textContent = `${Math.floor(distance)} m`;
    this.coinsEl.textContent = String(coins);
    this.devilEl.style.display = devilActive ? '' : 'none';
    this.devilFill.style.width = `${Math.round(danger * 100)}%`;
    this.devilEl.classList.toggle('danger', devilActive && danger > 0.55);
    const v = devilActive ? Math.max(0, (danger - 0.45) / 0.55) : 0;
    this.vignette.style.boxShadow = `inset 0 0 120px 40px rgba(255,0,0,${(v * 0.55).toFixed(2)})`;
    const pct = `${(progress * 100).toFixed(1)}%`;
    this.journeyFill.style.width = pct;
    this.journeyMark.style.left = pct;
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastEl.classList.remove('show');
    }
  }

  toast(text: string, seconds = 1.2, sub = ''): void {
    (this.toastEl.querySelector('[data-toast-main]') as HTMLElement).textContent = text;
    this.toastSub.textContent = sub;
    this.toastEl.classList.add('show');
    this.toastTimer = seconds;
  }

  /** Brief white flash (passing through Heaven's Gate). */
  flash(): void {
    this.flashEl.classList.remove('go');
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add('go');
  }

  hint(text: string | null): void {
    if (text) this.hintEl.textContent = text;
    this.hintEl.classList.toggle('show', !!text);
  }
}
