// @refresh reload
import 'solid-devtools';
// import { attachDevtoolsOverlay } from '@solid-devtools/overlay';
import { mount, StartClient } from '@solidjs/start/client';
import * as Sentry from '@sentry/solidstart';
import { solidRouterBrowserTracingIntegration } from '@sentry/solidstart/solidrouter';

Sentry.init({
  dsn: 'https://35bba8e88da7358f9697fbbc5a4d5634@o4508044913541120.ingest.us.sentry.io/4508044917800960',
  integrations: [solidRouterBrowserTracingIntegration(), Sentry.replayIntegration()],
  // Performance Monitoring
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ['localhost', /^https:\/\/yourserver\.io\/api/],
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0 // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

mount(() => <StartClient />, document.getElementById('app')!);

// attachDevtoolsOverlay({
//   defaultOpen: false, // or alwaysOpen
//   noPadding: true
// });
