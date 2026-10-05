import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // Alamat IP (bukan "localhost") agar tidak salah ke IPv6;
      // backend C hanya mendengarkan 127.0.0.1.
      '/api': 'http://127.0.0.1:8080',
    },
  },
})