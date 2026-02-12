import { defineConfig, loadEnv } from 'vite';
import tailwind from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../../', '');

  return {
    plugins: [react(), tailwind()],
    logLevel: 'warn',
    define: {
      __ENABLE_TEST_PANEL__: env.ENABLE_TEST_PANEL === 'true' ? 'true' : 'false',
    },
    build: {
      outDir: '../../dist/client',
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        input: {
          splash: 'splash.html',
          game: 'game.html',
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name][extname]',
        },
      },
    },
  };
});
