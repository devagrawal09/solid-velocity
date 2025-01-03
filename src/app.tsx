import { Link, MetaProvider, Title } from '@solidjs/meta';
import { Router } from '@solidjs/router';
import { FileRoutes } from '@solidjs/start/router';
import { ClerkProvider } from 'clerk-solidjs';
import { ErrorBoundary, ParentProps, Suspense } from 'solid-js';
import Header from '~/components/Header';
import { Button } from '~/components/ui/button';
import { Toaster } from '~/components/ui/toast';
import './app.css';

export default function App() {
  return (
    <Router
      root={props => (
        <DefaultErrorBoundary>
          <MetaProvider>
            <Title>Momentum Developer Conference</Title>
            <Link rel='manifest' href="/manifest.json" />
            <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
              <Suspense>
                <Header />
                {props.children}
                <Toaster />
              </Suspense>
            </ClerkProvider>
          </MetaProvider>
        </DefaultErrorBoundary>
      )}
    >
      <FileRoutes />
    </Router>
  );
}

function DefaultErrorBoundary(props: ParentProps) {
  return (
    <ErrorBoundary
      fallback={(err, reset) => {
        console.log({ err });
        return (
          <div class="flex flex-col gap-4">
            <p>Whoops, something crashed!</p>
            <p>{err.toString()}</p>
            <Button variant="secondary" onClick={reset}>
              Try again
            </Button>
          </div>
        );
      }}
    >
      {props.children}
    </ErrorBoundary>
  );
}
