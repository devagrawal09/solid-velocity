import { defineConfig } from '@solidjs/start/config';
import devtools from 'solid-devtools/vite';
import { sentrySolidStartVite } from '@sentry/solidstart';

export default defineConfig({
  middleware: './src/middleware.ts',
  server: {
    preset: 'vercel',
    prerender: {
      routes: ['/']
    }
  },
  ssr: false,
  vite: {
    plugins: [
      devtools({
        /* features options - all disabled by default */
        autoname: true // e.g. enable autoname
      }),
      sentrySolidStartVite({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN
      })
    ]
  }
});
