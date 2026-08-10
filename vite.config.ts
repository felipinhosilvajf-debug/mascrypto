import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuração para publicar no GitHub Pages em subpasta
export default defineConfig({
  plugins: [react()],
  base: '/mascrypto/',
})
