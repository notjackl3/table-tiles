import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Increase timeouts for file uploads
        timeout: 120000, // 2 minutes
        proxyTimeout: 120000, // 2 minutes
        // Handle large file uploads
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('[Vite Proxy] Proxy error:', err);
          });
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            // Log proxy requests for debugging
            if (req.url?.includes('upload')) {
              console.log('[Vite Proxy] Proxying upload request:', req.url);
            }
          });
        }
      }
    }
  }
});
