import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // O './' garante que todos os arquivos (CSS/JS) usem caminhos relativos
})
