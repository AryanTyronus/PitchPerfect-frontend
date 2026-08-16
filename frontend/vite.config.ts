import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The local FastAPI backend (view-link.cx/tRAzwIQ3fRV resolves here).
// Vite's proxy does not follow redirects, so target the resolved origin.
const BACKEND_TARGET = 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: BACKEND_TARGET,
        changeOrigin: true,
      },
      '/ws': {
        target: BACKEND_TARGET,
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
