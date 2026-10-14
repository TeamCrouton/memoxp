import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// En développement, les appels /api sont redirigés vers l'API locale.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:4000' } },
})
