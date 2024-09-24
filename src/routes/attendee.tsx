import { Title } from '@solidjs/meta';
import { RouteDefinition } from '@solidjs/router';
import { Suspense } from 'solid-js';
import { AttendeeDashboard } from '~/features/attendee';

export const route = {
  preload() {}
} satisfies RouteDefinition;

export default function Home() {
  return (
    <main class="px-2 sm:px-5">
      <Title>Attendee Dashboard | Momentum Developer Conference</Title>
      <div class="flex justify-between">
        <h1 class="text-4xl font-semibold my-4">Attendee Dashboard</h1>
      </div>
      <Suspense>
        <AttendeeDashboard />
      </Suspense>
    </main>
  );
}
