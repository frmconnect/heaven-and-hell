// Renders a reference picture (PNG) of every exported model in art/models/ -> art/reference/.
// Usage: node scripts/export-models.cjs && node scripts/render-refs.cjs
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const list = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.glb')) list.push(path.relative(path.join(root, 'art/models'), p)); } })(path.join(root, 'art/models'));
(async () => {
  const vite = spawn('npx', ['vite', '--port', '4182', '--strictPort'], { cwd: root, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  let shots = null;
  for (let a = 0; a < 4 && !shots; a++) {
    try {
      await p.goto('http://localhost:4182/tools/render-refs.html'); await p.waitForTimeout(1500);
      shots = await p.evaluate(async (files) => (await import('/tools/render-refs.ts')).renderAll(files), list);
    } catch (e) { console.log('retry:', e.message.split('\n')[0]); await p.waitForTimeout(2000); }
  }
  const outDir = path.join(root, 'art/reference');
  fs.rmSync(outDir, { recursive: true, force: true });
  for (const [f, b64] of Object.entries(shots)) {
    const dest = path.join(outDir, f.replace(/\.glb$/, '.png'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(b64, 'base64'));
  }
  console.log('rendered', Object.keys(shots).length);
  await b.close(); vite.kill();
})();
