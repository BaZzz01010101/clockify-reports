import react from '@vitejs/plugin-react';
import path from 'node:path';

const config = {
  root: path.resolve(__dirname, 'src/renderer'),
  base: './',
  build: {
    emptyOutDir: true,
    outDir: path.resolve(__dirname, '.vite/renderer/main_window'),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
};

export default config;
