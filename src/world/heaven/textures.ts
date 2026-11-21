import * as THREE from 'three';
import { Rng } from '../../core/rng';
import { canvasTexture } from '../hell/textures';

/** White marble with soft grey and gold veins, for the Stairway and the Gate. */
export function marbleTexture(tint = '#f4f1ea', vein = 'rgba(150,140,130,0.35)'): THREE.CanvasTexture {
  const r = new Rng(31);
  return canvasTexture(256, (g, s) => {
    g.fillStyle = tint;
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 300; i++) {
      g.fillStyle = `rgba(255,255,255,${r.range(0.1, 0.4)})`;
      g.fillRect(r.range(0, s), r.range(0, s), r.range(4, 20), r.range(4, 20));
    }
    for (let i = 0; i < 10; i++) {
      g.strokeStyle = i % 4 === 0 ? 'rgba(212,170,70,0.6)' : vein;
      g.lineWidth = r.range(0.6, 1.8);
      g.beginPath();
      let x = r.range(0, s), y = r.range(0, s);
      g.moveTo(x, y);
      for (let k = 0; k < 8; k++) { x += r.range(-30, 30); y += r.range(-30, 30); g.lineTo(x, y); }
      g.stroke();
    }
    g.strokeStyle = 'rgba(160,150,140,0.5)';
    g.lineWidth = 2;
    g.strokeRect(0, 0, s, s);
  });
}

/** Pale stone path with moss between the stones (Heavenly Gardens). */
export function gardenPathTexture(): THREE.CanvasTexture {
  const r = new Rng(41);
  return canvasTexture(256, (g, s) => {
    g.fillStyle = '#7fae5a';
    g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 32) {
      for (let x = (y / 32) % 2 ? -16 : 0; x < s; x += 32) {
        const v = r.int(215, 240);
        g.fillStyle = `rgb(${v},${v - 8},${v - 25})`;
        g.beginPath();
        if (g.roundRect) g.roundRect(x + 2, y + 2, 28 + r.range(-2, 2), 28 + r.range(-2, 2), 6);
        else g.rect(x + 2, y + 2, 28, 28);
        g.fill();
      }
    }
    for (let i = 0; i < 70; i++) {
      g.fillStyle = r.chance(0.5) ? 'rgba(255,190,220,0.9)' : 'rgba(255,250,200,0.9)';
      g.beginPath();
      g.arc(r.range(0, s), r.range(0, s), r.range(1, 2.5), 0, Math.PI * 2);
      g.fill();
    }
  });
}

/** Glowing crystal-and-gold bridge deck (Celestial Bridges). */
export function bridgeTexture(): THREE.CanvasTexture {
  return canvasTexture(256, (g, s) => {
    const grad = g.createLinearGradient(0, 0, s, 0);
    grad.addColorStop(0, '#cfe6ff');
    grad.addColorStop(0.5, '#f4f9ff');
    grad.addColorStop(1, '#cfe6ff');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(220,180,80,0.9)';
    g.lineWidth = 3;
    for (let y = 0; y <= s; y += s / 8) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(s, y); g.stroke();
    }
    g.strokeStyle = 'rgba(120,170,255,0.5)';
    g.lineWidth = 1;
    for (let x = 0; x <= s; x += s / 6) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, s); g.stroke();
    }
  });
}

/** Polished gold tiles (Golden Kingdom). */
export function goldTileTexture(): THREE.CanvasTexture {
  const r = new Rng(51);
  return canvasTexture(256, (g, s) => {
    for (let y = 0; y < s; y += 64) {
      for (let x = 0; x < s; x += 64) {
        const grad = g.createLinearGradient(x, y, x + 64, y + 64);
        const v = r.range(0.85, 1);
        grad.addColorStop(0, `rgb(${255 * v},${215 * v},${110 * v})`);
        grad.addColorStop(1, `rgb(${200 * v},${150 * v},${50 * v})`);
        g.fillStyle = grad;
        g.fillRect(x, y, 64, 64);
        g.strokeStyle = 'rgba(255,250,220,0.8)';
        g.lineWidth = 2;
        g.strokeRect(x + 2, y + 2, 60, 60);
      }
    }
  });
}

/** Soft puffy cloud layer, seen from above. */
export function cloudTexture(color = '#ffffff', shade = 'rgba(200,215,240,0.9)'): THREE.CanvasTexture {
  const r = new Rng(61);
  return canvasTexture(256, (g, s) => {
    g.fillStyle = shade;
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 90; i++) {
      const x = r.range(0, s), y = r.range(0, s), rad = r.range(14, 42);
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      // draw wrapped so the texture tiles seamlessly
      for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
        g.beginPath(); g.arc(x + ox, y + oy, rad, 0, Math.PI * 2); g.fill();
      }
    }
  });
}

/** Looking down through a gap: clouds far below (Heaven) or the glow of Hell (Stairway). */
export function voidTexture(hellBelow: boolean): THREE.CanvasTexture {
  return canvasTexture(128, (g, s) => {
    const grad = g.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s * 0.7);
    if (hellBelow) {
      grad.addColorStop(0, '#ff7a1a');
      grad.addColorStop(0.35, '#8a1404');
      grad.addColorStop(1, '#120202');
    } else {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, '#9cc4ff');
      grad.addColorStop(1, '#2a4a8a');
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  });
}
