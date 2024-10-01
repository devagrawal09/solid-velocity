import * as Sentry from '@sentry/solidstart';

Sentry.init({
  dsn: 'https://35bba8e88da7358f9697fbbc5a4d5634@o4508044913541120.ingest.us.sentry.io/4508044917800960',

  // Performance Monitoring
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ['localhost', /^https:\/\/yourserver\.io\/api/]
});
