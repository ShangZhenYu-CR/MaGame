import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    modulePreload: { polyfill: false },
    cssCodeSplit: false,
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      output: { format: 'iife', inlineDynamicImports: true },
      input: {
        main: resolve(__dirname, 'dev.html'),
      },
    },
  },
});
