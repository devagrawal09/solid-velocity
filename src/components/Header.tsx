import { A } from '@solidjs/router';
import { Show } from 'solid-js';
import logoImg from '../logo.svg';
import { Button } from './ui/button';
import { SignInButton, useClerk, UserButton } from 'clerk-solidjs';
import { FaSolidScrewdriverWrench } from 'solid-icons/fa';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { adminMode, toggleAdminMode } from '~/features/admin';

export default function Header() {
  const clerk = useClerk();

  const speakerId = () => clerk()?.user?.publicMetadata.speakerId;
  const isSignedIn = () => !!clerk()?.user;

  const isAdmin = () => clerk()?.user?.publicMetadata.role === 'admin';

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
      <Show when={isSignedIn() && adminMode()}>
        <A href={`/attendee`} class="text-lg">
          <Button variant="link" class="text-white">
            Attendee Dashboard
          </Button>
        </A>
      </Show>

      <div class="grow"></div>

      <Show when={isAdmin()}>
        <Tooltip openDelay={100} closeDelay={200}>
          <TooltipTrigger>
            <Button variant={adminMode() ? `success` : `default`} onClick={toggleAdminMode}>
              <FaSolidScrewdriverWrench />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toogle Admin Mode</TooltipContent>
        </Tooltip>
      </Show>
      <Show when={isSignedIn()} fallback={<SignInButton>Sign In</SignInButton>}>
        <UserButton />
      </Show>
    </header>
  );
}
