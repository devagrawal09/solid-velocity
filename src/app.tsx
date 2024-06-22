import { MetaProvider, Title } from '@solidjs/meta';
import { Router } from '@solidjs/router';
import { FileRoutes } from '@solidjs/start/router';
import { Suspense } from 'solid-js';
import './app.css';
import { ClerkProvider } from '~/components/ClerkProvider';
import Header from '~/components/Header';
import { Toaster } from '~/components/ui/toast';

export default function App() {
  return (
    <Router
      root={props => (
        <MetaProvider>
          <Title>Momentum Developer Conference</Title>
          <ClerkProvider>
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
