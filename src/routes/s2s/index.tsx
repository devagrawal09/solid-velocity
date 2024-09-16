import { Title } from '@solidjs/meta';
import { RouteDefinition } from '@solidjs/router';
import { Suspense } from 'solid-js';
import { ScheduleSkeleton, SpeakerDashboard } from '~/features/speakers/dashboard';
import { getRequestSpeakerFn, getSignedUpSpeakersFn } from '~/features/speakers/api';
import { getSessionizeData } from '~/features/sessionize/api';
import { SpeakerImpersonator } from '~/features/speakers/impersonator';

export const route = {
  load() {
    getRequestSpeakerFn();
    getSessionizeData();
    getSignedUpSpeakersFn();
  }
} satisfies RouteDefinition;

export default function SpeakerDashboardPage() {
  return (
    <main class="px-5">
      <Title>Speaker Dashboard | Momentum Developer Conference</Title>
      <div class="flex justify-between">
        <h1 class="text-4xl font-semibold my-4">Speaker Dashboard</h1>
        <SpeakerImpersonator />
      </div>
      <Suspense fallback={<ScheduleSkeleton />}>
        <SpeakerDashboard />
      </Suspense>
    </main>
  );
}
