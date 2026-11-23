import type { AudioManager } from '../audio/AudioManager';
import { SOUNDS, type SoundName } from '../audio/sounds';
import type { SaveData } from '../systems/SaveData';

export interface SettingsActions {
  onGraphics: () => void; // graphics quality changed
  onDeleteOnline: () => Promise<boolean>; // delete online leaderboard data
  onResetProgress: () => void; // start the game over
}

/**
 * Settings (Decisions log #33, #36): sound, vibration, graphics quality, how to play, privacy policy,
 * credits, delete online data, reset progress, and a list to preview every sound.
 */
export class SettingsScreen {
  private el: HTMLDivElement;
  private view: 'main' | 'howto' | 'credits' = 'main';

  constructor(root: HTMLElement, private save: SaveData, private audio: AudioManager, private onClose: () => void, private actions: SettingsActions) {
    this.el = document.createElement('div');
    this.el.className = 'screen settings';
    this.el.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    root.appendChild(this.el);
  }

  open(view: 'main' | 'howto' = 'main'): void {
    this.view = view;
    this.render();
    this.el.classList.add('on');
  }

  close(): void {
    this.el.classList.remove('on');
  }

  private head(title: string, back: boolean): string {
    return `<div class="shop-head">${back ? '<button class="icon-btn" data-back aria-label="Back">‹</button>' : ''}<div class="shop-title">${title}</div><button class="icon-btn" data-close aria-label="Close">✕</button></div>`;
  }

  private render(): void {
    if (this.view === 'howto') return this.renderHowTo();
    if (this.view === 'credits') return this.renderCredits();
    const d = this.save.data;
    const toggle = (id: string, on: boolean, onWord = 'ON', offWord = 'OFF') => `<button class="toggle ${on ? 'on' : ''}" data-toggle="${id}" aria-pressed="${on}">${on ? onWord : offWord}</button>`;
    const previews = (Object.keys(SOUNDS) as SoundName[]).map((k) => `<button class="preview" data-sound="${k}">▶ ${SOUNDS[k].label}</button>`).join('');
    this.el.innerHTML = `
      <div class="shop-panel settings-panel">
        ${this.head('SETTINGS', false)}
        <div class="set-scroll">
          <div class="set-label">Sound</div>
          <div class="set-row"><span>Sound effects</span>${toggle('sfx', !!d.sfxOn)}</div>
          <div class="set-row"><label for="vol">Volume</label><input id="vol" type="range" min="0" max="100" value="${Math.round(d.sfxVolume * 100)}"/></div>
          <div class="set-row"><span>World sounds (lava, wind…)</span>${toggle('amb', !!d.ambienceOn)}</div>
          <div class="set-row music"><span>Music</span><small>Original songs are coming: choose a song or shuffle, here.</small></div>
          <div class="set-label">Game</div>
          <div class="set-row"><span>Vibration</span>${toggle('vib', !!d.vibrateOn)}</div>
          <div class="set-row"><span>Graphics<small>Low runs smoother on older phones</small></span>${toggle('gfx', !!d.graphics, 'HIGH', 'LOW')}</div>
          <button class="set-row link" data-howto><span>How to play</span><b>›</b></button>
          <div class="set-label">About</div>
          <a class="set-row link" href="privacy.html" target="_blank" rel="noopener"><span>Privacy policy</span><b>›</b></a>
          <button class="set-row link" data-credits><span>Credits</span><b>›</b></button>
          <div class="set-label">Your data</div>
          <button class="set-row link danger" data-delete><span>Delete my online data<small>Removes your leaderboard scores and name</small></span><b>›</b></button>
          <button class="set-row link danger" data-reset><span>Reset progress<small>Start the game over from the beginning</small></span><b>›</b></button>
          <div class="set-label">Preview sounds</div>
          <div class="preview-grid">${previews}</div>
        </div>
        <div class="set-msg" data-msg></div>
      </div>
      <div class="confirm" data-confirm hidden></div>`;
    this.bindCommon();
    this.el.querySelectorAll<HTMLElement>('[data-toggle]').forEach((b) =>
      b.addEventListener('click', () => {
        const k = b.dataset.toggle;
        if (k === 'sfx') d.sfxOn = d.sfxOn ? 0 : 1;
        else if (k === 'amb') d.ambienceOn = d.ambienceOn ? 0 : 1;
        else if (k === 'vib') {
          d.vibrateOn = d.vibrateOn ? 0 : 1;
          if (d.vibrateOn) navigator.vibrate?.(40);
        } else if (k === 'gfx') d.graphics = d.graphics ? 0 : 1;
        this.persist();
        if (k === 'gfx') this.actions.onGraphics();
        this.render();
      }),
    );
    const vol = this.el.querySelector('#vol') as HTMLInputElement;
    vol.addEventListener('input', () => {
      d.sfxVolume = Number(vol.value) / 100;
      this.persist();
    });
    vol.addEventListener('change', () => this.audio.play('coin'));
    this.el.querySelectorAll<HTMLElement>('[data-sound]').forEach((b) =>
      b.addEventListener('click', () => {
        this.audio.unlock();
        this.audio.play(b.dataset.sound as SoundName, 0, 0);
      }),
    );
    this.el.querySelector('[data-howto]')?.addEventListener('click', () => { this.view = 'howto'; this.render(); });
    this.el.querySelector('[data-credits]')?.addEventListener('click', () => { this.view = 'credits'; this.render(); });
    this.el.querySelector('[data-delete]')?.addEventListener('click', () =>
      this.confirm('Delete your online data?', 'Your scores and name will be removed from the online leaderboard. Your progress on this phone stays.', 'DELETE', async () => {
        this.msg('Deleting…');
        const ok = await this.actions.onDeleteOnline();
        this.msg(ok ? 'Done — your online data is deleted.' : 'Couldn’t reach the leaderboard. Check your internet and try again.');
      }),
    );
    this.el.querySelector('[data-reset]')?.addEventListener('click', () =>
      this.confirm('Reset all progress?', 'Coins, shop items, upgrades, the Ascended State and best scores on this phone will be erased. This can’t be undone.', 'RESET', () => {
        this.actions.onResetProgress();
        this.msg('Progress reset. A fresh journey awaits.');
      }),
    );
  }

  private bindCommon(): void {
    this.el.querySelector('[data-close]')?.addEventListener('click', () => this.onClose());
    this.el.querySelector('[data-back]')?.addEventListener('click', () => { this.view = 'main'; this.render(); });
  }

  private msg(text: string): void {
    const m = this.el.querySelector('[data-msg]') as HTMLElement | null;
    if (m) m.textContent = text;
  }

  /** An "Are you sure?" box inside the page (phones block pop-up dialogs in some places). */
  private confirm(title: string, text: string, yes: string, onYes: () => void): void {
    const c = this.el.querySelector('[data-confirm]') as HTMLElement;
    c.innerHTML = `<div class="confirm-box"><div class="go-reason" style="font-size:22px">${title}</div><p>${text}</p>
      <button class="big-btn danger-btn" data-yes>${yes}</button><button class="ghost-btn" data-no>CANCEL</button></div>`;
    c.hidden = false;
    c.querySelector('[data-no]')?.addEventListener('click', () => { c.hidden = true; });
    c.querySelector('[data-yes]')?.addEventListener('click', () => { c.hidden = true; onYes(); });
  }

  private renderHowTo(): void {
    this.el.innerHTML = `
      <div class="shop-panel settings-panel">
        ${this.head('HOW TO PLAY', true)}
        <div class="set-scroll howto">
          <h3>Controls</h3>
          <p><b>Swipe left / right</b> to change lanes · <b>swipe up</b> to jump · <b>swipe down</b> to slide (in the air: drop fast).</p>
          <h3>Obstacles</h3>
          <p><b>Low barriers</b> — jump. <b>High beams</b> — slide under. <b>Walls</b> — change lanes. <b>Gaps and lava</b> — jump across.</p>
          <p>Hitting a barrier or beam makes you <b>stumble</b>. <b>3 stumbles close together</b> and you're caught. Walls and gaps end the run at once.</p>
          <h3>The journey</h3>
          <p>Escape <b>Hell</b> and the Devil, climb the <b>Stairway</b>, pass <b>Heaven's Gate</b> (a checkpoint) and cross three heavenly levels to reach <b>God</b>. After the Devil gives up, the <b>Shadow of your sins</b> chases you.</p>
          <h3>Grace and Sin</h3>
          <p><b>Save lost souls</b> (run through the glowing ghosts) and <b>leave the cursed red gold alone</b> to earn Grace — <b>jump over it</b> when it blocks the only path, and watch out: some of it <b>slides toward you</b>. Taking it adds Sin. You need <b>70% Grace</b> to pass judgment. <b>Miracle Shields</b> (golden halos) protect you from one hit.</p>
          <h3>The Ascended State</h3>
          <p>Pass judgment to run forever. Run cleanly to grow your <b>multiplier (up to x5)</b>, fill the <b>ability button</b> and tap it. Compete on the <b>leaderboards</b>.</p>
        </div>
      </div>`;
    this.bindCommon();
  }

  private renderCredits(): void {
    this.el.innerHTML = `
      <div class="shop-panel settings-panel">
        ${this.head('CREDITS', true)}
        <div class="set-scroll howto">
          <h3>Final Freedom</h3>
          <p>Escape Hell. Climb to Heaven. Face Judgment. Earn Freedom. Compete for Eternity.</p>
          <h3>Created by</h3>
          <p data-creator><b>Cody Webb</b> — game concept, design and original music.</p>
          <h3>Contact</h3>
          <p>finalfreedommobilegame@gmail.com</p>
          <h3>Development</h3>
          <p>Built with Claude (Anthropic). 3D graphics with three.js. Sound effects synthesized for this game.</p>
          <h3>Thank you</h3>
          <p>To every tester and every player. Run free.</p>
        </div>
      </div>`;
    this.bindCommon();
  }

  private persist(): void {
    const d = this.save.data;
    this.audio.setSettings({ sfxOn: !!d.sfxOn, sfxVolume: d.sfxVolume, ambienceOn: !!d.ambienceOn });
    this.save.save();
  }
}
