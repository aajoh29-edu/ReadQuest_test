import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Custom plugin to enforce production boundaries
const enforceProductionBoundaries = () => ({
  name: 'enforce-production-boundaries',
  closeBundle() {
    // Vite copies the entire /public directory to /dist by default
    const demoPath = path.resolve(__dirname, 'dist/demo.html');
    if (fs.existsSync(demoPath)) {
      fs.unlinkSync(demoPath);
      console.log('Security: Removed demo.html from production build.');
    }
  }
});

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Only run the deletion plugin during the production build
    mode === 'production' && enforceProductionBoundaries()
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  publicDir: 'public',
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
}));
