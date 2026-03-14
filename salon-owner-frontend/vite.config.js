import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5173,
    open: true,
    cors: true,
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',          // esbuild is 20–40x faster than terser, same output quality
    target: 'es2020',
    chunkSizeWarningLimit: 500, // warn if any chunk exceeds 500 kB

    rollupOptions: {
      output: {
        // Split vendor code into separate cacheable chunks
        // Users only re-download what actually changed
        manualChunks: {
          'react-core':   ['react', 'react-dom'],
          'react-router': ['react-router-dom'],
          'ui-libs':      ['lucide-react', 'react-hot-toast'],
          'http-utils':   ['axios', 'date-fns'],
        },
      },
    },
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'lucide-react'],
  },
})
