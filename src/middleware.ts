import { createMiddleware } from '@solidjs/start/middleware';
import { clerkMiddleware } from 'clerk-solidjs/server';
import { sentryBeforeResponseMiddleware } from '@sentry/solidstart';

export default createMiddleware({
  onBeforeResponse: [sentryBeforeResponseMiddleware()],
  onRequest: [
    clerkMiddleware({
      publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
      secretKey: process.env.CLERK_SECRET_KEY
    })
  ]
});
