import { Title } from '@solidjs/meta';
import { RouteDefinition } from '@solidjs/router';
import { ErrorBoundary, ParentProps, Show, Suspense } from 'solid-js';
import { useClerk } from '~/components/ClerkProvider';
import { Button } from '~/components/ui/button';
import { Schedule, ScheduleSkeleton } from '~/features/schedule';
import { getBookmarksFn } from '~/features/schedule/bookmarks';
import { getSessionizeData } from '~/features/sessionize/api';
import { SpeakerLandingAlert } from '~/features/speakers';

export const route = {
  load() {
    getSessionizeData();
    getBookmarksFn();
  }
} satisfies RouteDefinition;

export default function Home() {
  const { clerk } = useClerk();
  const speakerId = () => clerk()?.user?.publicMetadata.speakerId;

  return (
    <main class="px-5">
      <Title>Schedule | Momentum Developer Conference</Title>
      <Show when={speakerId()}>
        <SpeakerLandingAlert />
      </Show>
      <DefaultErrorBoundary>
        <Suspense fallback={<ScheduleSkeleton />}>
          <Schedule />
        </Suspense>
      </DefaultErrorBoundary>
    </main>
  );
}

function DefaultErrorBoundary(props: ParentProps) {
  return (
    <ErrorBoundary
      fallback={(err, reset) => (
        <div class="flex flex-col gap-4">
          <p>Whoops, something crashed!</p>
          <p>{err.toString()}</p>
          <Button variant="secondary" onClick={reset}>
            Try again
          </Button>
        </div>
      )}
    >
      {props.children}
    </ErrorBoundary>
  );
}
