import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve('./'),
    },
  },
  build: {
    target: 'esnext', // Required for WebGPU and Top-level await support
    outDir: 'dist',
    minify: 'esbuild',
    rollupOptions: {
      // CRITICAL: Prevent Vite from bundling libraries that are already provided 
      // by the importmap in index.html. This fixes the "Dual React" crash.
      external: [
        'react',
        'react/jsx-runtime',
        'react-dom',
        'react-dom/client',
        'lucide-react',
        'hash-wasm',
        'fflate',
        '@xenova/transformers',
        '@mlc-ai/web-llm',
        '@vercel/analytics',
        '@vercel/analytics/react',
        '@vercel/speed-insights/react'
      ]
    }
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
});