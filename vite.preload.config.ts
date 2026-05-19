import { builtinModules } from 'node:module';
import path from 'node:path';

const nodeBuiltins = builtinModules.flatMap((moduleName) => [moduleName, `node:${moduleName}`]);
const preloadEntry = path.resolve(__dirname, 'src/preload/index.ts');

const config = {
  build: {
    copyPublicDir: false,
    emptyOutDir: false,
    outDir: '.vite/build',
    ssr: preloadEntry,
    sourcemap: true,
    rollupOptions: {
      external: ['electron', 'electron/common', 'electron/renderer', ...nodeBuiltins],
      input: preloadEntry,
      output: {
        format: 'cjs',
        inlineDynamicImports: true,
        entryFileNames: 'preload.js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  resolve: {
    alias: {
      '@preload': path.resolve(__dirname, 'src/preload'),
      '@shared': path.resolve(__dirname, 'src/shared')
    }
  }
};

export default config;
