import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// FiveM serves the built files from disk, so we need relative asset paths
// (base: './') and a predictable output folder the fxmanifest globs.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'build',
    emptyOutDir: true,
    assetsDir: 'assets',
    // Keep everything in a single, predictable assets/ folder.
    // Hashed filenames bust FiveM's aggressive CEF cache after each rebuild.
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
