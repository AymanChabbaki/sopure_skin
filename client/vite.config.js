import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
      '/sitemap.xml': 'http://localhost:4000',
      '/robots.txt': 'http://localhost:4000',
      '/llms.txt': 'http://localhost:4000',
    },
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/recharts|d3-|victory/.test(id)) return 'charts';
          if (/motion|framer/.test(id)) return 'motion';
          if (/react-router|react-dom|scheduler|\/react\//.test(id)) return 'react';
          if (/i18next/.test(id)) return 'i18n';
          return undefined;
        },
      },
    },
  },
});
