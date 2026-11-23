import { ABILITIES, ABILITY_ORDER, type AbilityId } from '../systems/Abilities';
import { DAILY_REWARDS, MAX_UPGRADE, SHOP_ITEMS, type Shop, type ShopCategory } from '../systems/Shop';

type Tab = ShopCategory | 'upgrades';

const TABS: { id: Tab; label: string }[] = [
  { id: 'outfit', label: 'OUTFITS' },
  { id: 'wings', label: 'WINGS' },
  { id: 'trail', label: 'TRAILS' },
  { id: 'upgrades', label: 'UPGRADES' },
];

/**
 * The shop (Decisions log #24-28): spend coins on outfits, wings, trails and small ability upgrades.
 * The lower part of the screen is see-through so you can watch your runner wearing the item.
 */
export class ShopScreen {
  private el: HTMLDivElement;
  private tab: Tab = 'outfit';
  private daily: HTMLDivElement;

  constructor(
    root: HTMLElement,
    private shop: Shop,
    private onChange: () => void,
    private onClose: () => void,
    private unlockedAbility: (id: AbilityId) => boolean,
    private sound: (name: 'buy' | 'denied' | 'daily') => void = () => {},
  ) {
    this.el = document.createElement('div');
    this.el.className = 'screen shop';
    this.el.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    root.appendChild(this.el);
    this.daily = document.createElement('div');
    this.daily.className = 'screen daily';
    this.daily.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    root.appendChild(this.daily);
  }

  get isOpen(): boolean {
    return this.el.classList.contains('on');
  }

  open(): void {
    this.render();
    this.el.classList.add('on');
  }

  close(): void {
    this.el.classList.remove('on');
  }

  private toast(msg: string): void {
    const t = this.el.querySelector('.shop-msg') as HTMLElement | null;
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('show');
    void t.offsetWidth;
    t.classList.add('show');
  }

  private render(): void {
    const s = this.shop;
    const tabs = TABS.map((t) => `<button class="shop-tab ${t.id === this.tab ? 'on' : ''}" data-tab="${t.id}">${t.label}</button>`).join('');
    let body = '';
    if (this.tab === 'upgrades') {
      body = ABILITY_ORDER.map((id) => {
        const def = ABILITIES[id];
        const lvl = s.upgradeLevel(id);
        const price = s.upgradePrice(id);
        const pips = Array.from({ length: MAX_UPGRADE }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
        const secs = def.duration + def.upgradeStep * lvl;
        const locked = !this.unlockedAbility(id);
        const btn = price === null
          ? '<span class="shop-tag">MAX</span>'
          : `<button class="shop-buy" data-up="${id}" ${s.wallet < price ? 'data-poor' : ''}>${price.toLocaleString()} <span class="coin-dot"></span></button>`;
        return `<div class="shop-item"><div class="shop-swatch ability">✦</div>
          <div class="shop-info"><b>${def.name}</b><small>${secs.toFixed(1)} s now · +${def.upgradeStep} s per level${locked ? ` · unlocks at ${def.unlockDistance.toLocaleString()} m` : ''}</small><div class="pips">${pips}</div></div>${btn}</div>`;
      }).join('');
    } else {
      const equipped = s.equipped(this.tab);
      body = SHOP_ITEMS.filter((i) => i.category === this.tab).map((i) => {
        const owned = s.owns(i.id);
        const isOn = equipped === i.id;
        const sw = i.look.primary === 'transparent'
          ? '<div class="shop-swatch none">—</div>'
          : `<div class="shop-swatch" style="background:linear-gradient(135deg, ${i.look.primary}, ${i.look.secondary ?? i.look.glow ?? i.look.primary})"></div>`;
        const btn = isOn
          ? '<span class="shop-tag on">WEARING</span>'
          : owned
            ? `<button class="shop-buy owned" data-equip="${i.id}">WEAR</button>`
            : i.missionLevel
              ? `<span class="shop-tag lock">🔒 MISSION ${i.missionLevel}</span>`
              : `<button class="shop-buy" data-buy="${i.id}" ${s.wallet < i.price ? 'data-poor' : ''}>${i.price.toLocaleString()} <span class="coin-dot"></span></button>`;
        return `<div class="shop-item">${sw}<div class="shop-info"><b>${i.name}</b><small>${i.description}</small></div>${btn}</div>`;
      }).join('');
    }
    this.el.innerHTML = `
      <div class="shop-panel">
        <div class="shop-head"><div class="shop-title">SHOP</div>
          <div class="coins"><span class="coin-dot"></span><span>${s.wallet.toLocaleString()}</span></div>
          <button class="icon-btn" data-close aria-label="Close">✕</button></div>
        <div class="shop-tabs">${tabs}</div>
        <div class="shop-list">${body}</div>
        <div class="shop-note">Looks only — earned by playing, never bought with money.</div>
        <div class="shop-msg"></div>
      </div>`;
    this.el.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) => b.addEventListener('click', () => { this.tab = b.dataset.tab as Tab; this.render(); }));
    this.el.querySelector('[data-close]')?.addEventListener('click', () => this.onClose());
    this.el.querySelectorAll<HTMLElement>('[data-buy]').forEach((b) => b.addEventListener('click', () => {
      const r = s.buy(b.dataset.buy!);
      this.render();
      if (r === 'coins') { this.toast('Not enough coins yet — keep running!'); this.sound('denied'); }
      else if (r === 'ok') { this.toast('Bought and equipped!'); this.sound('buy'); this.onChange(); }
    }));
    this.el.querySelectorAll<HTMLElement>('[data-equip]').forEach((b) => b.addEventListener('click', () => {
      s.equip(b.dataset.equip!);
      this.render();
      this.onChange();
    }));
    this.el.querySelectorAll<HTMLElement>('[data-up]').forEach((b) => b.addEventListener('click', () => {
      const r = s.upgrade(b.dataset.up as AbilityId);
      this.render();
      if (r === 'coins') { this.toast('Not enough coins yet — keep running!'); this.sound('denied'); }
      else if (r === 'ok') { this.toast('Upgraded!'); this.sound('buy'); }
    }));
  }

  /** The daily reward pop-up (Decisions log #27). Returns false if there's nothing to claim today. */
  showDaily(onDone: () => void): boolean {
    const day = this.shop.dailyAvailable();
    if (!day) return false;
    const cells = DAILY_REWARDS.map((c, i) => `<div class="day ${i + 1 < day ? 'done' : i + 1 === day ? 'today' : ''}"><small>DAY ${i + 1}</small><b>${c}</b></div>`).join('');
    this.daily.innerHTML = `
      <div class="go-reason">Daily Reward</div>
      <div class="tagline">Come back every day — the reward grows for 7 days in a row.</div>
      <div class="days">${cells}</div>
      <button class="big-btn" data-claim>CLAIM ${DAILY_REWARDS[day - 1]} COINS</button>`;
    this.daily.querySelector('[data-claim]')?.addEventListener('click', () => {
      this.shop.claimDaily();
      this.sound('daily');
      this.daily.classList.remove('on');
      onDone();
    });
    this.daily.classList.add('on');
    return true;
  }
}
