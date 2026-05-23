import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/todo/',
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
