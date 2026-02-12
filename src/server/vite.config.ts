import { defineConfig, loadEnv } from 'vite';
import { builtinModules } from 'node:module';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../../', '');

  return {
    ssr: {
      noExternal: true,
    },
    logLevel: 'warn',
    define: {
      __ENABLE_TEST_PANEL__: env.ENABLE_TEST_PANEL === 'true' ? 'true' : 'false',
    },
    build: {
      ssr: 'index.ts',
      outDir: '../../dist/server',
      emptyOutDir: true,
      target: 'node22',
      sourcemap: false,
      rollupOptions: {
        external: [...builtinModules],

        output: {
          format: 'cjs',
          entryFileNames: 'index.cjs',
          inlineDynamicImports: true,
        },
      },
    },
  };
});
