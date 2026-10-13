/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // На GitHub Pages сайт живёт в подпапке, поэтому базовый путь задаётся
  // переменной окружения при сборке. Локально и на Vercel остаётся '/'.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Запасной путь на случай, если GREEN-API не отдаёт CORS-заголовки.
    // Включается переменной VITE_USE_PROXY=true (см. README, раздел «CORS»).
    proxy: {
      '/green-api': {
        target: 'https://api.green-api.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/green-api/, ''),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // e2e/ запускается Playwright'ом, Vitest их не трогает.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
