import type { BoardRow, Leaderboard, MyRank, Period } from '../systems/Leaderboard';
import { nameChoices } from '../systems/Names';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'daily', label: 'TODAY' },
  { id: 'weekly', label: 'THIS WEEK' },
  { id: 'alltime', label: 'ALL TIME' },
];

/**
 * Online leaderboards (Decisions log #29-32): daily, weekly and all-time, each with your own rank.
 * Also the heavenly-name picker.
 */
export class LeaderboardScreen {
  private el: HTMLDivElement;
  private period: Period = 'daily';
  private loadId = 0;

  constructor(
    root: HTMLElement,
    private lb: Leaderboard,
    private player: () => { id: string; name: string; ascended: boolean },
    private onName: (name: string) => void,
    private onClose: () => void,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'screen board';
    this.el.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    root.appendChild(this.el);
  }

  open(): void {
    this.el.classList.add('on');
    if (!this.player().name && this.lb.configured) this.showNamePicker();
    else this.render();
  }

  close(): void {
    this.el.classList.remove('on');
  }

  /** Choose a heavenly name (no typing, so nothing rude can appear). */
  showNamePicker(then?: () => void): void {
    this.el.classList.add('on');
    const names = nameChoices(6);
    this.el.innerHTML = `
      <div class="go-reason">Choose your name</div>
      <div class="tagline">This is how other players will see you on the leaderboard.</div>
      <div class="name-grid">${names.map((n) => `<button class="name-pick" data-name="${n}">${n}</button>`).join('')}</div>
      <button class="ghost-btn" data-more>SHOW OTHER NAMES</button>
      <button class="ghost-btn" data-back>BACK</button>`;
    this.el.querySelectorAll<HTMLElement>('[data-name]').forEach((b) =>
      b.addEventListener('click', () => {
        this.onName(b.dataset.name!);
        if (then) then();
        else this.render();
      }),
    );
    this.el.querySelector('[data-more]')?.addEventListener('click', () => this.showNamePicker(then));
    this.el.querySelector('[data-back]')?.addEventListener('click', () => (then ? then() : this.player().name ? this.render() : this.onClose()));
  }

  private render(): void {
    const p = this.player();
    const tabs = PERIODS.map((t) => `<button class="shop-tab ${t.id === this.period ? 'on' : ''}" data-period="${t.id}">${t.label}</button>`).join('');
    let note = '';
    if (!this.lb.configured) note = '<div class="board-note">The online leaderboard isn’t switched on yet. Your best scores are saved on this phone.</div>';
    else if (!p.ascended) note = '<div class="board-note">Reach God and pass judgment to compete. Only Ascended State scores count.</div>';
    this.el.innerHTML = `
      <div class="shop-panel board-panel">
        <div class="shop-head"><div class="shop-title">LEADERBOARD</div><button class="icon-btn" data-close aria-label="Close">✕</button></div>
        <div class="shop-tabs">${tabs}</div>
        ${note}
        <div class="board-me" data-me></div>
        <div class="board-list" data-list>${this.lb.configured ? '<div class="board-note">Loading…</div>' : ''}</div>
        ${p.name ? `<div class="board-name">You are <b>${p.name}</b> · <button class="link-btn" data-rename>change name</button></div>` : ''}
      </div>`;
    this.el.querySelectorAll<HTMLElement>('[data-period]').forEach((b) => b.addEventListener('click', () => { this.period = b.dataset.period as Period; this.render(); }));
    this.el.querySelector('[data-close]')?.addEventListener('click', () => this.onClose());
    this.el.querySelector('[data-rename]')?.addEventListener('click', () => this.showNamePicker());
    if (this.lb.configured) void this.load();
  }

  private async load(): Promise<void> {
    const id = ++this.loadId;
    const p = this.player();
    const [rows, me] = await Promise.all([this.lb.top(this.period, p.id), this.lb.myRank(this.period, p.id)]);
    if (id !== this.loadId || !this.el.classList.contains('on')) return;
    const list = this.el.querySelector('[data-list]') as HTMLElement | null;
    const meEl = this.el.querySelector('[data-me]') as HTMLElement | null;
    if (!list || !meEl) return;
    if (rows === null) {
      list.innerHTML = '<div class="board-note">Can’t reach the leaderboard. Check your internet and try again.</div>';
      return;
    }
    list.innerHTML = rows.length ? rows.map((r) => this.row(r)).join('') : '<div class="board-note">No scores yet — be the first!</div>';
    meEl.innerHTML = this.meLine(me);
  }

  private row(r: BoardRow): string {
    const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `${r.rank}`;
    return `<div class="board-row ${r.isMe ? 'me' : ''}"><span class="board-rank">${medal}</span><span class="board-who">${r.name}</span><b>${r.score.toLocaleString()}</b></div>`;
  }

  private meLine(me: MyRank | null): string {
    if (!me) return '';
    return `Your best: <b>${me.score.toLocaleString()}</b> · rank <b>#${me.rank}</b> of ${me.players}`;
  }
}
