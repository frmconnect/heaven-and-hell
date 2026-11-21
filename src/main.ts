import './ui/styles.css';
import { Game } from './core/Game';

/** Shows a friendly message instead of a blank screen if something goes wrong. */
function showError(err: unknown): void {
  if (document.querySelector('.error-box')) return;
  const box = document.createElement('div');
  box.className = 'error-box';
  const msg = err instanceof Error ? err.message : String(err);
  box.innerHTML = `<h2>Something went wrong</h2><p>Tap below to restart the game.</p>
    <button class="big-btn">RESTART</button><pre></pre>`;
  (box.querySelector('pre') as HTMLElement).textContent = msg;
  box.querySelector('button')?.addEventListener('click', () => location.reload());
  document.body.appendChild(box);
}

window.addEventListener('error', (e) => showError(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => showError(e.reason));
window.addEventListener('game-error', (e) => showError((e as CustomEvent).detail));

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

try {
  if (!hasWebGL()) throw new Error('This device or browser does not support 3D graphics (WebGL).');
  const game = new Game(document.getElementById('game') as HTMLElement, document.getElementById('ui') as HTMLElement);
  (window as unknown as { __game: Game }).__game = game;
} catch (err) {
  showError(err);
}
