/** The in-run display: score, distance, coins, Devil meter, pause button, and short messages. */
export class HUD {
  readonly el: HTMLDivElement;
  private scoreEl: HTMLElement;
  private distEl: HTMLElement;
  private coinsEl: HTMLElement;
  private devilEl: HTMLElement;
  private devilFill: HTMLElement;
  private toastEl: HTMLElement;
  private hintEl: HTMLElement;
  private vignette: HTMLElement;
  private toastTimer = 0;

  constructor(root: HTMLElement, onPause: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'hud';
    this.el.innerHTML = `
      <div class="vignette"></div>
      <div class="hud-row">
        <div><div class="score" data-score>0</div><div class="sub" data-dist>0 m</div></div>
        <div style="display:flex;gap:10px;align-items:center">
          <div class="coins"><span class="coin-dot"></span><span data-coins>0</span></div>
          <button class="icon-btn" data-pause aria-label="Pause">II</button>
        </div>
      </div>
      <div class="devil-meter" data-devil>THE DEVIL<div class="devil-bar"><div class="devil-fill" data-devil-fill></div></div></div>
      <div class="toast" data-toast></div>
      <div class="hint" data-hint></div>`;
    root.appendChild(this.el);
    const q = (s: string) => this.el.querySelector(s) as HTMLElement;
    this.scoreEl = q('[data-score]');
    this.distEl = q('[data-dist]');
    this.coinsEl = q('[data-coins]');
    this.devilEl = q('[data-devil]');
    this.devilFill = q('[data-devil-fill]');
    this.toastEl = q('[data-toast]');
    this.hintEl = q('[data-hint]');
    this.vignette = q('.vignette');
    const pause = q('[data-pause]');
    pause.addEventListener('click', onPause);
    // stop the pause tap from also counting as a swipe/tap on the game
    pause.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  }

  show(on: boolean): void {
    this.el.classList.toggle('on', on);
  }

  update(dt: number, score: number, distance: number, coins: number, danger: number): void {
    this.scoreEl.textContent = String(score);
    this.distEl.textContent = `${Math.floor(distance)} m`;
    this.coinsEl.textContent = String(coins);
    this.devilFill.style.width = `${Math.round(danger * 100)}%`;
    this.devilEl.classList.toggle('danger', danger > 0.55);
    const v = Math.max(0, (danger - 0.45) / 0.55);
    this.vignette.style.boxShadow = `inset 0 0 120px 40px rgba(255,0,0,${(v * 0.55).toFixed(2)})`;
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastEl.classList.remove('show');
    }
  }

  toast(text: string, seconds = 1.2): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    this.toastTimer = seconds;
  }

  hint(text: string | null): void {
    if (text) this.hintEl.textContent = text;
    this.hintEl.classList.toggle('show', !!text);
  }
}
