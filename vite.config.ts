import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(process.env.GOOGLE_MAPS_PLATFORM_KEY || '')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // CSS code splitting for smaller per-page CSS
      cssCodeSplit: true,
      // Enable source maps only in production for debugging
      sourcemap: false,
      // Minify with esbuild (built-in, no extra deps needed)
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            // Core framework chunk
            'vendor-react': ['react', 'react-dom', 'react-hot-toast'],
            // Animation libraries - separate from main bundle
            'vendor-motion': ['motion'],
            // UI Icons
            'vendor-icons': ['lucide-react'],
            // Firebase
            'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/storage', 'firebase/auth'],
            // Analytics & Charts (heavy, rarely used)
            'vendor-recharts': ['recharts'],
            'vendor-swiper': ['swiper/react', 'swiper/modules'],
            // Lottie animations (heavy)
            'vendor-lottie': ['@lottiefiles/dotlottie-react'],
          },
          // Chunk size warnings
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
      // Target modern browsers for smaller bundles (Vite default is best)
      // target: 'es2015',
      // Reduce CSS size
      cssMinify: true,
      // Report gzip sizes for debugging
      reportCompressedSize: false,
      // Increase chunk size warning limit (Firebase is large)
      chunkSizeWarningLimit: 800,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
