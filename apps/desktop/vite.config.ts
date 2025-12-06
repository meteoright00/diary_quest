import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Tauri expects a fixed port will fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
  },

  // Tauri uses a different preview server
  preview: {
    port: 1420,
    strictPort: true,
  },

  // to make use of `TAURI_DEBUG` and other env variables
  // https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
  envPrefix: ['VITE_', 'TAURI_'],

  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS and Linux
    target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
    // Rollup options to externalize Node.js built-ins
    rollupOptions: {
      external: [
        'better-sqlite3',
        'crypto',
        'fs',
        'path',
        'util',
      ],
    },
  },

  // Optimize dependencies excluding Node.js modules
  optimizeDeps: {
    exclude: ['better-sqlite3'],
  },
});
