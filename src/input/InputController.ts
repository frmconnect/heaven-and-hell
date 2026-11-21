import type { Action } from '../player/PlayerMotion';

const SWIPE_MIN_PX = 28;

/**
 * Turns swipes (phone) and arrow keys / WASD (computer) into game actions.
 * A swipe fires as soon as the finger has moved far enough, so it feels instant.
 */
export class InputController {
  private startX = 0;
  private startY = 0;
  private tracking = false;
  private handlers: ((a: Action) => void)[] = [];
  private tapHandlers: (() => void)[] = [];
  private moved = false;

  constructor(target: HTMLElement) {
    target.addEventListener('touchstart', this.onStart, { passive: false });
    target.addEventListener('touchmove', this.onMove, { passive: false });
    target.addEventListener('touchend', this.onEnd, { passive: false });
    target.addEventListener('pointerdown', this.onPointerDown);
    target.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('keydown', this.onKey);
  }

  onAction(h: (a: Action) => void): void {
    this.handlers.push(h);
  }
  onTap(h: () => void): void {
    this.tapHandlers.push(h);
  }

  private emit(a: Action): void {
    for (const h of this.handlers) h(a);
  }

  private onStart = (e: TouchEvent): void => {
    if (e.cancelable) e.preventDefault();
    const t = e.changedTouches[0];
    this.begin(t.clientX, t.clientY);
  };
  private onMove = (e: TouchEvent): void => {
    if (e.cancelable) e.preventDefault();
    const t = e.changedTouches[0];
    this.track(t.clientX, t.clientY);
  };
  private onEnd = (e: TouchEvent): void => {
    if (e.cancelable) e.preventDefault();
    this.finish();
  };
  // Mouse drag works too (handy on a computer). Touch is handled above.
  private onPointerDown = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return;
    this.begin(e.clientX, e.clientY);
    const move = (ev: PointerEvent) => this.track(ev.clientX, ev.clientY);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', () => window.removeEventListener('pointermove', move), { once: true });
  };
  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return;
    this.finish();
  };

  private begin(x: number, y: number): void {
    this.startX = x;
    this.startY = y;
    this.tracking = true;
    this.moved = false;
  }
  private track(x: number, y: number): void {
    if (!this.tracking) return;
    const action = swipeToAction(x - this.startX, y - this.startY);
    if (action) {
      this.emit(action);
      this.moved = true;
      // allow chaining another swipe without lifting the finger
      this.startX = x;
      this.startY = y;
    }
  }
  private finish(): void {
    if (this.tracking && !this.moved) for (const h of this.tapHandlers) h();
    this.tracking = false;
  }

  private onKey = (e: KeyboardEvent): void => {
    const map: Record<string, Action> = {
      ArrowLeft: 'left', a: 'left', A: 'left',
      ArrowRight: 'right', d: 'right', D: 'right',
      ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump',
      ArrowDown: 'slide', s: 'slide', S: 'slide',
    };
    const a = map[e.key];
    if (a) {
      e.preventDefault();
      if (!e.repeat) this.emit(a);
    }
  };
}

/** Decide which way a finger moved. Returns null if it hasn't moved far enough. */
export function swipeToAction(dx: number, dy: number, minPx = SWIPE_MIN_PX): Action | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < minPx) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'jump' : 'slide';
}
