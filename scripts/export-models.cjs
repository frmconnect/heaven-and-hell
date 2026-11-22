// Exports all game models to art/models/*.glb using the Vite dev server + a headless browser.
// Usage: node scripts/export-models.cjs
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
(async () => {
  const vite = spawn('npx', ['vite', '--port', '4180', '--strictPort'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  let files = null;
  // the dev server may reload the page once while it prepares new modules: retry
  for (let attempt = 0; attempt < 4 && !files; attempt++) {
    try {
      await p.goto('http://localhost:4180/tools/export.html');
      await p.waitForTimeout(1500);
      files = await p.evaluate(async () => (await import('/tools/export-models.ts')).exportAll());
    } catch (e) {
      console.log('retrying:', e.message.split('\n')[0]);
      await p.waitForTimeout(2000);
    }
  }
  if (!files) throw new Error('export failed');
  const outDir = path.join(__dirname, '..', 'art', 'models');
  fs.rmSync(outDir, { recursive: true, force: true });
  let total = 0;
  for (const [rel, b64] of Object.entries(files)) {
    const f = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    const buf = Buffer.from(b64, 'base64');
    fs.writeFileSync(f, buf);
    total += buf.length;
  }
  console.log(`wrote ${Object.keys(files).length} files, ${(total / 1024).toFixed(0)} KB`);
  if (errs.length) console.log('errors:', errs.slice(0, 5));
  await b.close();
  vite.kill();
})();
