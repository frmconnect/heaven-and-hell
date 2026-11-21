import { describe, expect, it } from 'vitest';
import { InputController } from '../src/input/InputController';
import type { Action } from '../src/player/PlayerMotion';

/** Fake screen element so we can send pretend finger movements. */
function setup() {
  const h: Record<string, (e: unknown) => void> = {};
  (globalThis as { window?: unknown }).window = { addEventListener: () => {}, removeEventListener: () => {} };
  const target = { addEventListener: (t: string, fn: (e: unknown) => void) => (h[t] = fn) } as unknown as HTMLElement;
  const input = new InputController(target);
  const actions: Action[] = [];
  let taps = 0;
  input.onAction((a) => actions.push(a));
  input.onTap(() => taps++);
  const touch = (type: string, x: number, y: number) =>
    h[type]({ cancelable: true, preventDefault: () => {}, changedTouches: [{ clientX: x, clientY: y }] });
  return { actions, touch, taps: () => taps };
}

describe('touch swipes', () => {
  it('a long swipe moves only ONE lane (bug fix: used to jump to the far lane)', () => {
    const { actions, touch } = setup();
    touch('touchstart', 50, 400);
    for (let x = 60; x <= 350; x += 10) touch('touchmove', x, 400); // 300 px swipe in small steps
    touch('touchend', 350, 400);
    expect(actions).toEqual(['right']);
  });
  it('two separate swipes give two moves', () => {
    const { actions, touch } = setup();
    for (let i = 0; i < 2; i++) {
      touch('touchstart', 300, 400);
      touch('touchmove', 200, 400);
      touch('touchmove', 100, 400);
      touch('touchend', 100, 400);
    }
    expect(actions).toEqual(['left', 'left']);
  });
  it('a fast flick with no move events still counts as one swipe', () => {
    const { actions, touch, taps } = setup();
    touch('touchstart', 300, 400);
    touch('touchend', 100, 400);
    expect(actions).toEqual(['left']);
    expect(taps()).toBe(0);
  });
  it('a touch that barely moves is a tap, not a swipe', () => {
    const { actions, touch, taps } = setup();
    touch('touchstart', 100, 100);
    touch('touchend', 102, 101);
    expect(actions).toEqual([]);
    expect(taps()).toBe(1);
  });
});
