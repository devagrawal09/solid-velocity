import { Title } from '@solidjs/meta';
import type { RouteDefinition } from '@solidjs/router';
import { Show, Suspense } from 'solid-js';
import { useClerk } from 'clerk-solidjs';
import { Schedule, ScheduleSkeleton } from '~/features/schedule';
import { getUserBookmarks } from '~/features/bookmarks';
import { getSessionizeData } from '~/features/sessionize/api';
import { SpeakerLandingAlert } from '~/features/speakers';

export const route = {
  preload() {
    getSessionizeData();
    getUserBookmarks();
  }
} satisfies RouteDefinition;

export default function Home() {
  const clerk = useClerk();
  const speakerId = () => clerk()?.user?.publicMetadata.speakerId;

  return (
    <main class="px-2 sm:px-5">
      <Title>Schedule | Momentum Developer Conference</Title>
      <Show when={speakerId()}>
        <SpeakerLandingAlert />
      </Show>
      <Suspense fallback={<ScheduleSkeleton />}>
        <Schedule />
      </Suspense>
    </main>
  );
}
