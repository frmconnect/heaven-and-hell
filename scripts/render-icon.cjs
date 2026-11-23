// Renders the app icon concept to art/icon/. Usage: node scripts/render-icon.cjs
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const CAM = { x: 0.8, y: 2.3, z: -1.0, lx: 0, ly: 7.1, lz: -20, fov: 58 };
const RUNNER_Z = -9.0;
const GATE_SCALE = 0.58;
(async () => {
  const vite = spawn('npx', ['vite', '--port', '4184', '--strictPort'], { cwd: root, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  let img = null;
  for (let a = 0; a < 4 && !img; a++) {
    try {
      await p.goto('http://localhost:4184/tools/icon.html'); await p.waitForTimeout(1500);
      img = await p.evaluate(async ([cam, rz, gs]) => {
        const m = await import('/tools/render-icon.ts');
        return { big: m.renderIcon(1024, cam, rz, gs), small: m.renderIcon(512, cam, rz, gs) };
      }, [CAM, RUNNER_Z, GATE_SCALE]);
    } catch (e) { console.log('retry:', e.message.split('\n')[0]); await p.waitForTimeout(2000); }
  }
  fs.mkdirSync(path.join(root, 'art/icon'), { recursive: true });
  fs.writeFileSync(path.join(root, 'art/icon/icon-1024.png'), Buffer.from(img.big, 'base64'));
  fs.writeFileSync(path.join(root, 'art/icon/icon-512.png'), Buffer.from(img.small, 'base64'));
  console.log('icon rendered');
  await b.close(); vite.kill();
})();
