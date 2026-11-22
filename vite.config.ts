import { defineConfig } from 'vitest/config';

// base './' makes the built game work from any sub-folder link (e.g. GitHub Pages).
// build label shown on the menu, so the owner can tell which version their phone has
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(stamp) },
  build: { outDir: 'dist', chunkSizeWarningLimit: 1000 },
  test: { include: ['tests/**/*.test.ts'] },
});
