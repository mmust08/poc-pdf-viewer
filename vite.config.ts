import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // pdfjs-dist uses top-level await — must not be pre-bundled by Vite
    exclude: ['pdfjs-dist'],
  },
  worker: {
    format: 'es',
  },
})
