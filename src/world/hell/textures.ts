import * as THREE from 'three';
import { Rng } from '../../core/rng';

export function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (!g) throw new Error('Canvas 2D is not supported on this device');
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Dark volcanic stone with glowing cracks, for the running path. */
export function basaltTexture(): THREE.CanvasTexture {
  const r = new Rng(11);
  return canvasTexture(256, (g, s) => {
    g.fillStyle = '#1c1312';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 600; i++) {
      const v = 18 + r.int(0, 22);
      g.fillStyle = `rgb(${v + 6},${v},${v - 2})`;
      g.fillRect(r.range(0, s), r.range(0, s), r.range(2, 10), r.range(2, 10));
    }
    // stone slab seams
    g.strokeStyle = '#0a0606';
    g.lineWidth = 3;
    for (let y = 0; y <= s; y += s / 4) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(s, y); g.stroke();
    }
    // glowing cracks
    for (let i = 0; i < 7; i++) {
      let x = r.range(0, s), y = r.range(0, s);
      g.strokeStyle = r.chance(0.5) ? '#ff5a12' : '#c4260a';
      g.lineWidth = r.range(1, 2.5);
      g.shadowColor = '#ff6a00';
      g.shadowBlur = 8;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += r.range(-22, 22); y += r.range(-22, 22);
        g.lineTo(x, y);
      }
      g.stroke();
    }
  });
}

/** Swirling molten lava. */
export function lavaTexture(): THREE.CanvasTexture {
  const r = new Rng(5);
  return canvasTexture(256, (g, s) => {
    const grad = g.createLinearGradient(0, 0, s, s);
    grad.addColorStop(0, '#ff4a00');
    grad.addColorStop(0.5, '#ff7b12');
    grad.addColorStop(1, '#e02a00');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = r.chance(0.5) ? 'rgba(255,220,90,0.55)' : 'rgba(120,10,0,0.55)';
      g.beginPath();
      g.ellipse(r.range(0, s), r.range(0, s), r.range(6, 30), r.range(4, 14), r.range(0, 3), 0, Math.PI * 2);
      g.fill();
    }
    // dark crust plates
    for (let i = 0; i < 14; i++) {
      g.fillStyle = 'rgba(40,6,2,0.75)';
      g.beginPath();
      const cx = r.range(0, s), cy = r.range(0, s);
      g.moveTo(cx, cy);
      for (let k = 0; k < 6; k++) g.lineTo(cx + r.range(-26, 26), cy + r.range(-26, 26));
      g.closePath();
      g.fill();
    }
  });
}

/** Rock face with red glowing veins, for walls. */
export function rockTexture(): THREE.CanvasTexture {
  const r = new Rng(23);
  return canvasTexture(128, (g, s) => {
    g.fillStyle = '#2a1714';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 160; i++) {
      const v = 25 + r.int(0, 30);
      g.fillStyle = `rgb(${v + 10},${v},${v - 4})`;
      g.fillRect(r.range(0, s), r.range(0, s), r.range(3, 14), r.range(3, 14));
    }
    g.strokeStyle = '#ff3a0a';
    g.shadowColor = '#ff3a0a';
    g.shadowBlur = 6;
    for (let i = 0; i < 4; i++) {
      g.lineWidth = r.range(1, 2);
      g.beginPath();
      let x = r.range(0, s), y = 0;
      g.moveTo(x, y);
      while (y < s) { x += r.range(-12, 12); y += r.range(8, 20); g.lineTo(x, y); }
      g.stroke();
    }
  });
}
