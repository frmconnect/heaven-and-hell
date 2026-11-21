import { defineConfig } from 'vitest/config';

// base './' makes the built game work from any sub-folder link (e.g. GitHub Pages).
export default defineConfig({
  base: './',
  build: { outDir: 'dist', chunkSizeWarningLimit: 1000 },
  test: { include: ['tests/**/*.test.ts'] },
});
