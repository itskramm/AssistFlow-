import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vite build config for the AssistFlow Chrome extension.
 *
 * Produces two output bundles:
 *  - index.html / assets/*  — the React side panel UI
 *  - content.js             — the content script injected into CRM pages
 *
 * background.js and manifest.json are static files in public/ and are
 * copied into dist/ as-is by Vite's public directory handling.
 *
 * Output lands in dist/ which is loaded directly into Chrome via
 * chrome://extensions → "Load unpacked".
 */
export default defineConfig({
  plugins: [react()],

  build: {
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      input: {
        // Side panel entry — Vite resolves index.html automatically
        sidepanel: resolve(__dirname, 'index.html'),
        // Content script — bundled as a plain IIFE so Chrome can inject it
        content: resolve(__dirname, 'src/content.js'),
      },
      output: {
        // Keep the content script as a flat file (no hash) so the manifest
        // reference stays stable across rebuilds.
        entryFileNames: (chunk) => {
          if (chunk.name === 'content') return 'content.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // content.js must be a self-contained IIFE — no ES module imports
        format: 'es',
      },
    },
  },

  // Dev server — used during UI development only (not for the extension itself)
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
});
