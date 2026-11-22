import type { AudioManager } from '../audio/AudioManager';
import { SOUNDS, type SoundName } from '../audio/sounds';
import type { SaveData } from '../systems/SaveData';

/**
 * Settings (Decisions log #33, #36): sound effects on/off + volume, world ambience on/off,
 * a "Preview sounds" list to hear every effect, and the place where the owner's music will go.
 */
export class SettingsScreen {
  private el: HTMLDivElement;

  constructor(root: HTMLElement, private save: SaveData, private audio: AudioManager, private onClose: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'screen settings';
    this.el.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    root.appendChild(this.el);
  }

  open(): void {
    this.render();
    this.el.classList.add('on');
  }

  close(): void {
    this.el.classList.remove('on');
  }

  private render(): void {
    const d = this.save.data;
    const toggle = (id: string, on: boolean) => `<button class="toggle ${on ? 'on' : ''}" data-toggle="${id}" aria-pressed="${on}">${on ? 'ON' : 'OFF'}</button>`;
    const previews = (Object.keys(SOUNDS) as SoundName[])
      .map((k) => `<button class="preview" data-sound="${k}">▶ ${SOUNDS[k].label}</button>`)
      .join('');
    this.el.innerHTML = `
      <div class="shop-panel settings-panel">
        <div class="shop-head"><div class="shop-title">SETTINGS</div><button class="icon-btn" data-close aria-label="Close">✕</button></div>
        <div class="set-row"><span>Sound effects</span>${toggle('sfx', !!d.sfxOn)}</div>
        <div class="set-row"><label for="vol">Volume</label><input id="vol" type="range" min="0" max="100" value="${Math.round(d.sfxVolume * 100)}"/></div>
        <div class="set-row"><span>World sounds (lava, wind…)</span>${toggle('amb', !!d.ambienceOn)}</div>
        <div class="set-row music"><span>Music</span><small>Original songs are coming: choose a song or shuffle, here.</small></div>
        <div class="set-label">Preview sounds</div>
        <div class="preview-grid">${previews}</div>
      </div>`;
    this.el.querySelector('[data-close]')?.addEventListener('click', () => this.onClose());
    this.el.querySelectorAll<HTMLElement>('[data-toggle]').forEach((b) =>
      b.addEventListener('click', () => {
        if (b.dataset.toggle === 'sfx') d.sfxOn = d.sfxOn ? 0 : 1;
        else d.ambienceOn = d.ambienceOn ? 0 : 1;
        this.persist();
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
  }

  private persist(): void {
    const d = this.save.data;
    this.audio.setSettings({ sfxOn: !!d.sfxOn, sfxVolume: d.sfxVolume, ambienceOn: !!d.ambienceOn });
    this.save.save();
  }
}
