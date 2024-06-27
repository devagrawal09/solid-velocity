import { Title } from '@solidjs/meta';
import { RouteDefinition } from '@solidjs/router';
import { Suspense } from 'solid-js';
import { ScheduleSkeleton, SpeakerDashboard, sessionizeData } from '~/features/speakers/dashboard';
import { getRequestSpeakerFn, getSignedUpSpeakersFn } from '~/features/speakers/api';

export const route = {
  load() {
    getRequestSpeakerFn();
    getSignedUpSpeakersFn();
    sessionizeData();
  }
} satisfies RouteDefinition;

export default function Home() {
  return (
    <main class="px-5">
      <Title>Speaker Dashboard | Momentum Developer Conference</Title>
      <h1 class="text-4xl font-semibold my-4">Speaker Dashboard</h1>
      <Suspense fallback={<ScheduleSkeleton />}>
        <SpeakerDashboard />
      </Suspense>
    </main>
  );
}
