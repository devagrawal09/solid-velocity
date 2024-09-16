import { A } from '@solidjs/router';
import { Show, createEffect, createMemo } from 'solid-js';
import logoImg from '../logo.svg';
import { Button } from './ui/button';
import { SignInButton, useClerk, UserButton } from 'clerk-solidjs';

export default function Header() {
  const clerk = useClerk();

  const isSignedIn = createMemo(() => Boolean(clerk()?.user));
  createEffect(() => console.log('user', clerk()?.user));
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
      <Show when={isSignedIn()}>
        <A href={`/attendee`} class="text-lg">
          <Button variant="link" class="text-white">
            Attendee Dashboard
          </Button>
        </A>
      </Show>

      <div class="grow"></div>

      <Show when={isSignedIn()} fallback={<SignInButton>Login</SignInButton>}>
        <UserButton />
      </Show>
    </header>
  );
}
