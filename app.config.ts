import { defineConfig } from '@solidjs/start/config';

export default defineConfig({
  middleware: './src/middleware.ts',
  server: {
    preset: 'vercel'
  },
  ssr: false
});
