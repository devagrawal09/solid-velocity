import { defineConfig } from '@solidjs/start/config';
import { plugins } from './postcss.config.cjs';
import devtools from 'solid-devtools/vite';

export default defineConfig({
  middleware: './src/middleware.ts',
  server: {
    preset: 'vercel'
  },
  ssr: false,
  vite: {
    plugins: [
      devtools({
        /* features options - all disabled by default */
        autoname: true // e.g. enable autoname
      })
    ]
  }
});
