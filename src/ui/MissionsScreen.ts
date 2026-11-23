import type { GoalView, MissionTracker } from '../systems/MissionTracker';
import { MISSION_UNLOCKS, missionReward, DAILY_REWARDS } from '../systems/Missions';
import { itemById } from '../systems/Shop';

/** Daily Challenges and Missions (Decisions log #40). */
export class MissionsScreen {
  private el: HTMLDivElement;
  private tab: 'daily' | 'missions' = 'daily';
  private timer = 0;

  constructor(root: HTMLElement, private tracker: MissionTracker, private onClose: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'screen missions';
    this.el.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    root.appendChild(this.el);
  }

  open(): void {
    this.render();
    this.el.classList.add('on');
    window.clearInterval(this.timer);
    this.timer = window.setInterval(() => this.updateCountdown(), 30000);
  }

  close(): void {
    this.el.classList.remove('on');
    window.clearInterval(this.timer);
  }

  private row(v: GoalView, reward?: string): string {
    const pct = Math.min(100, Math.round((v.progress / v.goal.target) * 100));
    return `<div class="goal ${v.done ? 'done' : ''}">
      <div class="goal-top"><span class="goal-check">${v.done ? '✓' : ''}</span><span class="goal-text">${v.text}</span>${reward ? `<span class="goal-reward">${reward}</span>` : ''}</div>
      <div class="goal-bar"><div style="width:${pct}%"></div></div>
      <div class="goal-num">${v.done ? 'Done!' : `${v.progress.toLocaleString('en-US')} / ${v.goal.target.toLocaleString('en-US')}`}</div>
    </div>`;
  }

  private countdown(): string {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const mins = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 60000));
    return `New challenges in ${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  private updateCountdown(): void {
    const c = this.el.querySelector('[data-countdown]');
    if (c) c.textContent = this.countdown();
  }

  private render(): void {
    const tabs = `<div class="shop-tabs"><button class="shop-tab ${this.tab === 'daily' ? 'on' : ''}" data-tab="daily">TODAY</button><button class="shop-tab ${this.tab === 'missions' ? 'on' : ''}" data-tab="missions">MISSIONS</button></div>`;
    let body = '';
    if (this.tab === 'daily') {
      const list = this.tracker.daily();
      const all = list.every((v) => v.done);
      body = `<div class="board-note" data-countdown>${this.countdown()}</div>
        ${list.map((v) => this.row(v, `+${v.reward} 🪙`)).join('')}
        <div class="goal bonus ${all ? 'done' : ''}"><div class="goal-top"><span class="goal-check">${all ? '✓' : ''}</span><span class="goal-text">Finish all three</span><span class="goal-reward">+${DAILY_REWARDS.allThree} 🪙</span></div></div>`;
    } else {
      const level = this.tracker['save'].data.mLevel as number;
      const next = MISSION_UNLOCKS.find((u) => u.level > level);
      const nextItem = next ? itemById(next.item) : undefined;
      body = `<div class="mission-level">MISSION LEVEL <b>${level}</b></div>
        <div class="board-note">Complete all three to reach level ${level + 1} and earn ${missionReward(level).toLocaleString('en-US')} coins.</div>
        ${this.tracker.missions().map((v) => this.row(v)).join('')}
        ${nextItem ? `<div class="unlock-next">✦ Level ${next!.level}: <b>${nextItem.name}</b> (exclusive, can't be bought)</div>` : '<div class="unlock-next">✦ You have every exclusive reward!</div>'}`;
    }
    this.el.innerHTML = `<div class="shop-panel board-panel">
        <div class="shop-head"><div class="shop-title">CHALLENGES</div><button class="icon-btn" data-close aria-label="Close">✕</button></div>
        ${tabs}<div class="board-list">${body}</div></div>`;
    this.el.querySelector('[data-close]')?.addEventListener('click', () => this.onClose());
    this.el.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) => b.addEventListener('click', () => { this.tab = b.dataset.tab as 'daily' | 'missions'; this.render(); }));
  }
}
