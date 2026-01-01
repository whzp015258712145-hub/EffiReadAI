import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        // The following help ensure that the proxy does not buffer the stream
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Ensure no buffering headers are propagated
            proxyRes.headers['x-accel-buffering'] = 'no';
          });
        },
      }
    }
  }
})
