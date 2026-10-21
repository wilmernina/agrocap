import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), VitePWA({
    strategies: 'injectManifest',
    srcDir: 'src',
    filename: 'sw.ts',
    registerType: 'autoUpdate',
    manifest: {
      name: 'AgroCAP Campo', short_name: 'AgroCAP', description: 'Gestión agropecuaria de AgroCAP',
      lang: 'es', start_url: '/campo-movil', scope: '/', display: 'standalone', orientation: 'portrait',
      background_color: '#f5f7f2', theme_color: '#183c25',
      icons: [
        { src: '/agrosys-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/agrosys-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      ],
    },
    injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'], maximumFileSizeToCacheInBytes: 8_000_000 },
  })],
  envDir: '..',
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query', '@tanstack/react-table'],
          charts: ['recharts'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
  },
});
