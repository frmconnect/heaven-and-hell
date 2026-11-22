// Packs the built game (dist/) into one self-contained HTML body file, for hosting as a claude.ai page.
// Usage: npm run build && node scripts/make-single-file.mjs <output.html>
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const out = process.argv[2] ?? 'dist-single/heaven-and-hell.html';
const files = readdirSync('dist/assets');
const js = readFileSync('dist/assets/' + files.find((f) => f.endsWith('.js')), 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync('dist/assets/' + files.find((f) => f.endsWith('.css')), 'utf8');
const html = `<title>Final Freedom</title>
<meta name="theme-color" content="#1a0503">
<style>:root{color-scheme:dark}${css}</style>
<div id="game"></div>
<div id="ui"></div>
<script type="module">${js}</script>
`;
writeFileSync(out, html);
console.log('wrote', out, Math.round(html.length / 1024), 'KB');
