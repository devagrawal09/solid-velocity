import { MetaProvider, Title } from '@solidjs/meta';
import { Router } from '@solidjs/router';
import { FileRoutes } from '@solidjs/start/router';
import { ClerkProvider } from 'clerk-solidjs';
import { Suspense } from 'solid-js';
import Header from '~/components/Header';
import { Toaster } from '~/components/ui/toast';
import './app.css';

export default function App() {
  return (
    <Router
      root={props => (
        <MetaProvider>
          <Title>Momentum Developer Conference</Title>
          <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
            <Suspense>
              <Header />
              {props.children}
              <Toaster />
            </Suspense>
          </ClerkProvider>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
