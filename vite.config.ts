import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Apex custom domain (dr-xas.org via CNAME) -> serve from root.
  base: '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
    sourcemap: false,
    rollupOptions: {
      // Deliberately NOT including go/index.html here — it lives under
      // public/ and must be copied byte-for-byte, unhashed, untransformed.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
})
