// Makes the store screenshots (Google 1080x1920, Apple 6.9" 1290x2796) and the Google Play banner (1024x500).
// Usage: npm run build && node scripts/store-shots.cjs   -> art/store/
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const OUT = path.join(root, 'art/store');
const today = Math.floor(Date.now() / 86400000);

const SIZES = {
  google: { w: 1080, h: 1920, cap: 360 },
  apple: { w: 1290, h: 2796, cap: 560 },
};

// Each scene: headline, colours, the link to open, and how to set the moment up.
const SCENES = [
  { id: '1-escape-hell', title: 'ESCAPE THE DEVIL', sub: 'Run for your soul through the fires of Hell', theme: 'hell', url: '/', save: {},
    setup: async (p) => {
      await p.tap('[data-play]');
      await settle(p, 600);
      await p.evaluate(() => { const s = window.__game.session; s.score.distance = 520; s.score.coins = 37;
        s.devil.gap = 5.2;
        Object.assign(s.moral.record, { soulsHelped: 4, soulsMissed: 0, temptationsResisted: 3, temptationsTaken: 0, miracles: 0 });
        s.obstacles = [{ id: 1e7, kind: 'low', lane: 1, z: 538, hit: false, theme: 'hell' }, { id: 1e7 + 1, kind: 'pit', lane: 0, z: 552, hit: false, theme: 'hell' }, { id: 1e7 + 2, kind: 'wall', lane: 2, z: 548, hit: false, theme: 'hell' }, { id: 1e7 + 3, kind: 'high', lane: 1, z: 575, hit: false, theme: 'hell' }];
        s.coins = [0, 1, 2, 3].map((i) => ({ id: 2e7 + i, lane: 1, z: 527 + i * 2.2, y: 1, taken: false })); s.pickups = []; });
      await freeze(p);
      await p.evaluate(() => { const s = window.__game.session; s.coins = s.coins.filter((c) => c.z > s.distance + 2); });
      await p.waitForTimeout(300);
    } },
  { id: '2-stairway', title: 'CLIMB TO HEAVEN', sub: 'The endless Stairway rises above the flames', theme: 'heaven', url: '/?stage=stairway', save: {},
    setup: async (p) => {
      await p.tap('[data-play]');
      await settle(p, 600);
      await p.evaluate(() => { const s = window.__game.session; const d = s.distance + 260; s.score.distance = d; s.score.coins = 112; s.devil.gap = 12; Object.assign(s.moral.record, { soulsHelped: 7, soulsMissed: 0, temptationsResisted: 5, temptationsTaken: 1, miracles: 1 });
        s.obstacles = [{ id: 1e7, kind: 'pit', lane: 0, z: d + 20, hit: false, theme: 'stairway' }, { id: 1e7 + 1, kind: 'high', lane: 2, z: d + 30, hit: false, theme: 'stairway' }, { id: 1e7 + 2, kind: 'low', lane: 1, z: d + 44, hit: false, theme: 'stairway' }];
        s.coins = [0, 1, 2, 3, 4].map((i) => ({ id: 2e7 + i, lane: 1, z: d + 6 + i * 2.2, y: 1, taken: false })); s.pickups = []; });
      await freeze(p);
    } },
  { id: '3-heavens-gate', title: "HEAVEN'S GATE", sub: 'The pearly gates open for those who reach them', theme: 'heaven', url: '/?stage=gate', save: {},
    setup: async (p) => {
      await p.tap('[data-play]');
      await settle(p, 400);
      await p.evaluate(() => { const s = window.__game.session; s.score.distance = 4060 - 44; s.obstacles = []; s.pickups = []; s.coins = [0, 1, 2, 3, 4, 5].map((i) => ({ id: 2e7 + i, lane: 1, z: 4020 + i * 2.2, y: 1, taken: false })); });
      await freeze(p);
    } },
  { id: '4-souls-and-sins', title: 'EVERY CHOICE COUNTS', sub: 'Save lost souls. Resist the cursed gold.', theme: 'heaven', url: '/?stage=gardens', save: {},
    setup: async (p) => {
      await p.tap('[data-play]');
      await settle(p, 600);
      await p.evaluate(() => { const s = window.__game.session; const d = s.distance + 434; s.score.distance = d; s.score.coins = 168; s.devil.gap = 12;
        Object.assign(s.moral.record, { soulsHelped: 11, soulsMissed: 1, temptationsResisted: 8, temptationsTaken: 1, miracles: 2 });
        s.obstacles = [{ id: 1e7, kind: 'high', lane: 1, z: d + 34, hit: false, theme: 'gardens' }, { id: 1e7 + 1, kind: 'wall', lane: 2, z: d + 40, hit: false, theme: 'gardens' }];
        s.pickups = [{ id: 3e7, kind: 'soul', lane: 0, z: d + 13, y: 0, taken: false, resolved: false }, { id: 3e7 + 1, kind: 'temptation', lane: 2, z: d + 15, y: 0, taken: false, resolved: false }];
        s.coins = [0, 1, 2].map((i) => ({ id: 2e7 + i, lane: 1, z: d + 6 + i * 2.2, y: 1, taken: false })); });
      await freeze(p);
    } },
  { id: '5-judgment', title: 'FACE JUDGMENT', sub: 'Your choices decide if you are free', theme: 'gold', url: '/?stage=kingdom', save: {},
    setup: async (p) => {
      await p.tap('[data-play]');
      await settle(p, 400);
      await p.evaluate(() => { const s = window.__game.session; Object.assign(s.moral.record, { soulsHelped: 15, soulsMissed: 1, temptationsResisted: 14, temptationsTaken: 1, miracles: 4 }); s.score.distance = 11735; });
      await p.waitForFunction(() => window.__game.state.state === 'Judgment', null, { timeout: 30000 });
      await p.waitForTimeout(300);
      await p.evaluate(() => document.querySelector('.screen.judgment').classList.add('skip'));
      await p.waitForTimeout(300);
    } },
  { id: '6-ascended', title: 'RUN FOREVER', sub: 'Fly, slow time and climb the world leaderboards', theme: 'cosmic', url: '/?ascended', save: { ascended: 1, ascendedBestDistance: 1800 },
    setup: async (p) => {
      await p.locator('[data-asc]').first().tap();
      await settle(p, 400);
      await p.evaluate(() => { const s = window.__game.session; s.score.distance = 4820; s.score.coins = 241; s.score.multiplier = 4; s.score.bonus = 18640; window.__game.hud.setMultiplier(4);
        s.obstacles = [{ id: 1e7, kind: 'wall', lane: 2, z: 4842, hit: false, theme: 'cosmic' }, { id: 1e7 + 1, kind: 'low', lane: 0, z: 4850, hit: false, theme: 'cosmic' }, { id: 1e7 + 2, kind: 'high', lane: 1, z: 4866, hit: false, theme: 'cosmic' }];
        s.coins = [0, 1, 2, 3, 4].map((i) => ({ id: 2e7 + i, lane: 1, z: 4826 + i * 2.2, y: 2.8, taken: false })); s.pickups = []; s.ability.charge = 1; s.useAbility(); });
      await settle(p, 900);
      await freeze(p);
    } },
  { id: '7-shop', title: 'EARN YOUR WINGS', sub: 'Outfits, wings and trails, earned by playing', theme: 'hell', url: '/', save: { wallet: 3420, walletReady: 1, owned: ['angel', 'firewings', 'embers'], outfit: 'angel', wings: 'firewings', trail: 'embers' },
    setup: async (p) => {
      await p.tap('[data-shop]');
      await p.locator('[data-tab="wings"]').tap();
      await p.waitForTimeout(800);
    } },
];

const THEMES = {
  hell: { bg: 'linear-gradient(180deg,#2a0503 0%,#5a0e04 100%)', title: '#ffd27a', glow: 'rgba(255,90,20,.7)', sub: '#ffd9b8' },
  heaven: { bg: 'linear-gradient(180deg,#2d4a9e 0%,#8fb0ee 100%)', title: '#ffffff', glow: 'rgba(255,215,120,.9)', sub: '#fff4d6' },
  gold: { bg: 'linear-gradient(180deg,#8a5a10 0%,#f2c86a 100%)', title: '#ffffff', glow: 'rgba(255,240,190,.9)', sub: '#fff6dc' },
  cosmic: { bg: 'linear-gradient(180deg,#0c0828 0%,#3a1a7a 100%)', title: '#e8d8ff', glow: 'rgba(170,120,255,.9)', sub: '#d8f4ff' },
};

async function settle(p, ms) { for (let t = 0; t < ms; t += 100) { await p.evaluate(() => { const s = window.__game.session; s.safeTimer = 5; }); await p.waitForTimeout(100); } }
// stop the run in place (the world keeps animating) and hide pop-up text
async function freeze(p) {
  await p.evaluate(() => { const s = window.__game.session; s.update = () => {}; s.safeTimer = 0; s.shield = false; });
  await p.addStyleTag({ content: '.toast,.hint,.pops,.gift-banner{display:none!important}' });
  await p.waitForTimeout(700);
}

(async () => {
  const preview = spawn('npx', ['vite', 'preview', '--port', '4186', '--strictPort'], { cwd: root, stdio: 'ignore' });
  const dev = spawn('npx', ['vite', '--port', '4187', '--strictPort'], { cwd: root, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 3000));
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const [store, S] of Object.entries(SIZES)) fs.mkdirSync(path.join(OUT, store), { recursive: true });

  const only = (process.env.ONLY || '').split(',').filter(Boolean);
  if (!only.length) fs.rmSync(OUT, { recursive: true, force: true });
  for (const sc of SCENES.filter((x) => !only.length || only.some((o) => x.id.startsWith(o)))) {
    for (const [store, S] of Object.entries(SIZES)) {
      const gameH = S.h - S.cap;
      const ctx = await b.newContext({ viewport: { width: S.w / 3, height: Math.round(gameH / 3) }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
      const p = await ctx.newPage();
      await p.goto('http://localhost:4186/');
      await p.evaluate((extra) => localStorage.setItem('heaven-and-hell.save', JSON.stringify(Object.assign({ version: 1, dailyDay: extra.today, testerGift: 1, playerName: 'Fearless Halo 83', bestScore: 12260 }, extra.save))), { today, save: sc.save });
      await p.goto('http://localhost:4186' + sc.url);
      await p.waitForTimeout(1000);
      await sc.setup(p);
      const shot = (await p.screenshot()).toString('base64');
      await ctx.close();
      // add the headline band on top
      const t = THEMES[sc.theme];
      const comp = await b.newPage({ viewport: { width: S.w, height: S.h } });
      const f = S.w / 1080;
      await comp.setContent(`<html><body style="margin:0;width:${S.w}px;height:${S.h}px;background:${t.bg};font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;overflow:hidden">
        <div style="height:${S.cap}px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 ${60 * f}px;box-sizing:border-box">
          <div style="font-size:${92 * f}px;font-weight:900;letter-spacing:${3 * f}px;line-height:1.05;color:${t.title};text-shadow:0 0 ${28 * f}px ${t.glow},0 ${4 * f}px ${10 * f}px rgba(0,0,0,.45)">${sc.title}</div>
          <div style="margin-top:${18 * f}px;font-size:${40 * f}px;font-weight:600;color:${t.sub};text-shadow:0 ${2 * f}px ${6 * f}px rgba(0,0,0,.45)">${sc.sub}</div>
        </div>
        <img src="data:image/png;base64,${shot}" style="display:block;width:${S.w}px;height:${S.h - S.cap}px"/></body></html>`);
      await comp.screenshot({ path: path.join(OUT, store, `${sc.id}.png`) });
      await comp.close();
    }
    console.log('made', sc.id);
  }

  // Google Play feature graphic (1024 x 500): the gate scene wide, with the title
  const page = await b.newPage();
  let art = null;
  for (let a = 0; a < 4 && !art; a++) {
    try {
      await page.goto('http://localhost:4187/tools/icon.html'); await page.waitForTimeout(1500);
      art = await page.evaluate(async () => (await import('/tools/render-icon.ts')).renderIcon([2048, 1000], { x: -3.0, y: 2.1, z: -2.5, lx: -5.6, ly: 6.6, lz: -20, fov: 44 }, -9.5, 0.58));
    } catch (e) { await page.waitForTimeout(2000); }
  }
  const banner = await b.newPage({ viewport: { width: 1024, height: 500 } });
  await banner.setContent(`<html><body style="margin:0;width:1024px;height:500px;overflow:hidden;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">
    <div style="position:relative;width:1024px;height:500px;background:url(data:image/png;base64,${art}) center/cover">
      <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(20,24,70,.88) 0%,rgba(20,24,70,.55) 42%,rgba(20,24,70,0) 62%)"></div>
      <div style="position:absolute;left:56px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center">
        <div style="font-size:96px;font-weight:900;line-height:.92;letter-spacing:2px;color:#fff6dc;text-shadow:0 0 30px rgba(255,200,90,.85),0 4px 10px rgba(0,0,0,.5)">FINAL<br>FREEDOM</div>
        <div style="margin-top:14px;font-size:26px;font-weight:800;letter-spacing:9px;color:#ffd27a;text-shadow:0 2px 6px rgba(0,0,0,.5)">HELL TO HEAVEN</div>
      </div>
    </div></body></html>`);
  fs.mkdirSync(path.join(OUT, 'google'), { recursive: true });
  await banner.screenshot({ path: path.join(OUT, 'google', 'feature-graphic-1024x500.png') });
  console.log('made feature graphic');
  await b.close(); preview.kill(); dev.kill();
})();
