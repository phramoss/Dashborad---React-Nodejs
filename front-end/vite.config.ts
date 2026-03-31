import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 3000,

    // ← ESSENCIAL: escuta em todas as interfaces de rede
    // Sem isso, só localhost acessa. Com isso, toda a rede acessa.
    host: '0.0.0.0',

    // O proxy roda no SERVIDOR Vite (sua máquina).
    // Qualquer PC da rede que abrir http://SEU_IP:3000
    // vai ter /api redirecionado para localhost:3001 — na SUA máquina.
    // O backend nunca é exposto diretamente para a rede.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})