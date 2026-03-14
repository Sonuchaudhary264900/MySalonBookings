import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],

  build: {
    minify: 'esbuild',           // faster than terser, same quality
    target: 'es2020',
    chunkSizeWarningLimit: 500,

    rollupOptions: {
      output: {
        manualChunks: {
          'react-core':   ['react', 'react-dom'],
          'react-router': ['react-router-dom'],
          'http':         ['axios'],
        },
      },
    },
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios'],
  },
})
