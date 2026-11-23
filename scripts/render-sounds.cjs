// Renders every sound effect to art/sounds/*.wav and prints a loudness check.
// Usage: node scripts/render-sounds.cjs
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
(async () => {
  const vite = spawn('npx', ['vite', '--port', '4183', '--strictPort'], { cwd: root, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const b = await chromium.launch();
  const p = await b.newPage();
  let res = null;
  for (let a = 0; a < 4 && !res; a++) {
    try {
      await p.goto('http://localhost:4183/tools/sounds.html'); await p.waitForTimeout(1500);
      res = await p.evaluate(async () => (await import('/tools/render-sounds.ts')).renderSounds());
    } catch (e) { console.log('retry:', e.message.split('\n')[0]); await p.waitForTimeout(2000); }
  }
  const dir = path.join(root, 'art/sounds');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const bad = [];
  for (const [name, r] of Object.entries(res)) {
    fs.writeFileSync(path.join(dir, `${name}.wav`), Buffer.from(r.wav, 'base64'));
    const flag = r.peak >= 0.99 ? 'CLIPS' : r.peak < 0.03 ? 'TOO QUIET' : r.phone < 0.06 ? 'QUIET ON PHONE' : 'ok';
    if (flag !== 'ok') bad.push(name);
    console.log(`${name.padEnd(14)} peak ${r.peak.toFixed(2)}  phone ${r.phone.toFixed(2)}  ${r.secs.toFixed(2)} s  ${flag}`);
  }
  console.log(bad.length ? `PROBLEMS: ${bad.join(', ')}` : 'all sounds ok');
  await b.close(); vite.kill();
})();
