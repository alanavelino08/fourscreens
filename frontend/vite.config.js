import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      '41b4-131-196-248-121.ngrok-free.app', // Tu dominio actual de ngrok
      '.ngrok-free.app' // Opcional: permite todos los subdominios de ngrok
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',  // Tu backend Django
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
