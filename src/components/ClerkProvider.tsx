import { createContext, createSignal, onMount, useContext } from 'solid-js';
import type { Accessor, Component, JSX } from 'solid-js';
import type { Clerk, ClerkOptions } from '@clerk/types';
import { createAsync, useNavigate } from '@solidjs/router';

export const ClerkContext = createContext<{
  clerk: Accessor<Clerk | undefined>;
}>();

interface Props {
  children?: JSX.Element;
}

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Publishable Key');
}

async function loadClerk(options: ClerkOptions) {
  const { Clerk: ClerkMain } = await import('@clerk/clerk-js');
  const instance = new ClerkMain(PUBLISHABLE_KEY);

  await instance.load(options);
  return instance;
}

export const ClerkProvider: Component<Props> = props => {
  const navigate = useNavigate();
  const [clerk, setClerk] = createSignal<Clerk>();

  onMount(async () => {
    const c = await loadClerk({
      routerPush: (to: string) => navigate(to),
      routerReplace: (to: string) => navigate(to, { replace: true })
    });
    setClerk(c);
  });

  return <ClerkContext.Provider value={{ clerk }}>{props.children}</ClerkContext.Provider>;
};

export function useClerk() {
  const clerk = useContext(ClerkContext);

  if (!clerk) {
    throw new Error('useClerk must be used within a <ClerkProvider> component');
  }

  return clerk;
}
