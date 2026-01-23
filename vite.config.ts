import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext', // Required for WebGPU and Top-level await support
    outDir: 'dist',
    minify: 'esbuild'
  },
  server: {
    headers: {
      // Security headers for local dev (SharedArrayBuffer support if needed later)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
});