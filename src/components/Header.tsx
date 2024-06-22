import { Show, createMemo } from 'solid-js';
import { clerkUI } from '~/directives/clerk';
import { useClerk } from './ClerkProvider';
import { A } from '@solidjs/router';
import logoImg from '../logo.svg';

export default function Header() {
  const { clerk, loaded } = useClerk();

  const isSignedIn = createMemo(() => {
    if (loaded()) {
      return Boolean(clerk()?.user);
    }

    return false;
  });

  return (
    <header class="flex justify-between items-center px-4">
      <A href="/">
        <img src={logoImg} alt="Momentum" width={64} height={64} />
      </A>
      <Show when={isSignedIn()} fallback={<a href="/sign-in">Sign In</a>}>
        <div use:clerkUI="UserButton"></div>
      </Show>
    </header>
  );
}
