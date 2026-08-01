import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [
      react(), 
      tailwindcss()
    ],
    build: {
      outDir: 'publish',
      target: 'esnext', // Use modern target for proper ESM support in Electron
      
      
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          // Explicitly separate the heavy data into its own chunk
          manualChunks: (id) => {
            if (id.includes('src/data/categories.ts') || id.includes('src/data/category_')) {
              return 'categories-data';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'icons';
            }
          }
        },
      },
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom"],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
