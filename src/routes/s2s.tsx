import { RouteDefinition } from '@solidjs/router';
import { Suspense } from 'solid-js';
import { SpeakerDashboard } from '~/features/speakers/dashboard';
import { getSignedUpSpeakersFn } from '~/features/speakers/s2s-store';

export const route = {
  load() {
    getSignedUpSpeakersFn();
  }
} satisfies RouteDefinition;

export default function Home() {
  return (
    <main class="px-5">
      <h1 class="text-4xl font-semibold my-4">Hello Speaker</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <SpeakerDashboard />
      </Suspense>
    </main>
  );
}
