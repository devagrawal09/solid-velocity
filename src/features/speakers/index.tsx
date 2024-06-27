import { makePersisted } from '@solid-primitives/storage';
import { A } from '@solidjs/router';
import { Show, createSignal } from 'solid-js';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';

export function SpeakerLandingAlert() {
  const [speakerVisited, setSpeakerVisited] = makePersisted(createSignal(false), {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    name: `speakerVisitsed`
  });

  return (
    <Show when={!speakerVisited()}>
      <Alert class="rounded border-white border-opacity-30 flex flex-col gap-1">
        <AlertTitle>Hello, Speaker!</AlertTitle>
        <AlertDescription>
          You can view{' '}
          <A
            onClick={() => setSpeakerVisited(true)}
            href="/s2s"
            class="underline text-gray-500 hover:text-gray-900"
          >
            your speaker dashboard here
          </A>
        </AlertDescription>
      </Alert>
    </Show>
  );
}
