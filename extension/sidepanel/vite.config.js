import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';

/**
 * Vite build config for the AssistFlow Chrome extension.
 *
 * Chrome extensions require:
 *  1. Relative asset paths (base: './') — absolute /assets/... paths break in
 *     extension pages loaded via chrome-extension://
 *  2. content.js as a self-contained IIFE — Chrome injects it into host pages
 *     which don't support ES module imports
 *  3. background.js and manifest.json copied from public/ as-is
 *  4. debug.html copied from the project root into dist/
 *
 * Build output (dist/):
 *  ├── manifest.json       ← copied from public/
 *  ├── background.js       ← copied from public/
 *  ├── content.js          ← bundled IIFE from src/content.js
 *  ├── index.html          ← side panel entry with relative asset paths
 *  ├── debug.html          ← copied from project root
 *  └── assets/
 *      ├── index-[hash].js ← React app bundle (ES module)
 *      └── index-[hash].css
 */
export default defineConfig({
  plugins: [
    react(),
    {
      // Custom plugin: after the main build, bundle content.js as a
      // separate IIFE and copy debug.html into dist/
      name: 'bundle-content-script',
      async closeBundle() {
        const { build } = await import('vite');

        // Build content.js as a standalone IIFE
        await build({
          configFile: false,
          build: {
            outDir: resolve(__dirname, 'dist'),
            emptyOutDir: false, // don't wipe the main build
            lib: {
              entry: resolve(__dirname, 'src/content.js'),
              name: 'AssistFlowContent',
              fileName: () => 'content.js',
              formats: ['iife'],
            },
            rollupOptions: {
              output: {
                inlineDynamicImports: true,
              },
            },
          },
          logLevel: 'warn',
        });

        // Copy debug.html and debug.js into dist/ so they're accessible as extension pages
        try {
          mkdirSync(resolve(__dirname, 'dist'), { recursive: true });
          copyFileSync(
            resolve(__dirname, 'debug.html'),
            resolve(__dirname, 'dist/debug.html')
          );
          copyFileSync(
            resolve(__dirname, 'debug.js'),
            resolve(__dirname, 'dist/debug.js')
          );
        } catch {
          // debug files are optional — silently skip if missing
        }
      },
    },
  ],

  // CRITICAL: relative base so asset paths in index.html are ./assets/...
  // not /assets/... — absolute paths break inside chrome-extension:// pages.
  base: './',

  build: {
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      input: {
        // Side panel HTML entry point
        sidepanel: resolve(__dirname, 'index.html'),
      },
      output: {
        format: 'es',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },

  server: {
    port: 5173,
    host: '0.0.0.0',
  },
});
