import { Show, createMemo } from 'solid-js';
import { clerkUI } from '~/directives/clerk';
import { useClerk } from './ClerkProvider';
import { A } from '@solidjs/router';
import logoImg from '../logo.svg';
import { Button } from './ui/button';

export default function Header() {
  const { clerk } = useClerk();

  const isSignedIn = createMemo(() => {
    return Boolean(clerk()?.user);
  });

  const speakerId = () => clerk()?.user?.publicMetadata.speakerId;

  return (
    <header class="flex items-center px-4 gap-4">
      <A href="/">
        <img src={logoImg} alt="Momentum" width={64} height={64} />
      </A>

      <Show when={speakerId()}>
        <A href={`/s2s`} class="text-lg">
          <Button variant="link" class="text-white">
            Speaker Dashboard
          </Button>
        </A>
      </Show>

      <div class="grow"></div>

      <Show when={isSignedIn()} fallback={<a href="/sign-in">Sign In</a>}>
        <div use:clerkUI="UserButton"></div>
      </Show>
    </header>
  );
}
