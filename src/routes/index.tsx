import { RouteDefinition } from '@solidjs/router';
import { Suspense } from 'solid-js';
import { Schedule, getBookmarksFn, sessionizeData } from '~/features/schedule';
import { SpeakerLandingAlert } from '~/features/speakers';

export const route = {
  load() {
    sessionizeData();
    getBookmarksFn();
  }
} satisfies RouteDefinition;

export default function Home() {
  return (
    <main class="px-5">
      <SpeakerLandingAlert />
      <h1 class="text-4xl font-semibold my-4">Schedule</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <Schedule />
      </Suspense>
    </main>
  );
}
