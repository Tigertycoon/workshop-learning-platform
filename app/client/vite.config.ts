import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true
      },
      '/uploads': {
        target: apiTarget,
        changeOrigin: true
      },
      '/games': {
        target: apiTarget,
        changeOrigin: true
      },
      '/screenshots': {
        target: apiTarget,
        changeOrigin: true
      }
    }
  },
  preview: {
    host: '127.0.0.1'
  }
});
