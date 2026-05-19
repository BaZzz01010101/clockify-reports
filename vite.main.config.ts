import { builtinModules } from 'node:module';
import path from 'node:path';

const nodeBuiltins = builtinModules.flatMap((moduleName) => [moduleName, `node:${moduleName}`]);
const mainEntry = path.resolve(__dirname, 'src/main/index.ts');

const config = {
  build: {
    copyPublicDir: false,
    emptyOutDir: false,
    outDir: '.vite/build',
    ssr: mainEntry,
    sourcemap: true,
    rollupOptions: {
      external: [
        'electron',
        'electron/common',
        'electron/main',
        'electron-squirrel-startup',
        'keytar',
        ...nodeBuiltins,
      ],
      input: mainEntry,
      output: {
        entryFileNames: 'main.js',
        format: 'cjs',
      },
    },
  },
  resolve: {
    alias: {
      '@main': path.resolve(__dirname, 'src/main'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
    conditions: ['node'],
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
};

export default config;
