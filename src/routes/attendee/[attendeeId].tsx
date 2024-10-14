import { clerkClient } from '@clerk/clerk-sdk-node';
import { cache, createAsync, redirect, RouteDefinition, useParams } from '@solidjs/router';
import { RedirectToSignIn } from 'clerk-solidjs';
import { createEffect, createSignal, onCleanup, Show, Suspense } from 'solid-js';
import { getRequestAuth } from '~/auth';
import { db } from '~/db/drizzle';
import { attendeeProfiles, connectionTable } from '~/db/schema';

const visitAttendee = cache(async (attendeeId: string) => {
  'use server';

  // add attendeeId to connecions using current user profile id
  const auth = getRequestAuth();
  if (!auth?.userId) return `unauthorized`;

  const userId = auth.userId;
  const visitedProfile = await db.query.attendeeProfiles.findFirst({
    where: (attendee, { eq }) => eq(attendee.id, attendeeId)
  });

  if (!visitedProfile) {
    throw redirect(`/attendee?status=notfound`);
  }
  // Find the profiles associated with this user
  let profile = await db.query.attendeeProfiles.findFirst({
    where: (attendee, { eq }) => eq(attendee.userId, userId)
  });

  if (!profile) {
    // If there is no profile, that means this is first time user visits the app
    // So we silently create a new profile for them
    const clerkUser = await clerkClient.users.getUser(userId);
    [profile] = await db
      .insert(attendeeProfiles)
      .values([
        {
          userId: userId,
          name: clerkUser.fullName || '',
          avatarUrl: clerkUser.imageUrl || ''
        }
      ])
      .returning();
  }

  if (profile.id === attendeeId) {
    throw redirect(`/attendee?status=notfound`);
  }

  const [connection] = await db
    .insert(connectionTable)
    .values([{ to: attendeeId, from: profile.id }])
    .returning()
    .onConflictDoNothing();

  if (!connection) {
    throw redirect(`/attendee?status=alreadyconnected&profile=${visitedProfile.id}`);
  }

  throw redirect(`/attendee?status=success&profile=${visitedProfile.id}`);
}, `visitAttendee`);

export const route = {
  preload({ params }) {
    visitAttendee(params.attendeeId);
  }
} satisfies RouteDefinition;

export default function AttendeeView() {
  const params = useParams<{ attendeeId: string }>();
  const result = createAsync(() => visitAttendee(params.attendeeId));

  return (
    <div class="p-4">
      <Suspense
        fallback={
          <>
            Looking for attendee profile{' '}
            <span role="img" aria-label="globe">
              🌍
            </span>
          </>
        }
      >
        <Show when={result() === 'unauthorized'}>
          <NotSignedIn />
        </Show>
      </Suspense>
    </div>
  );
}

function NotSignedIn() {
  const [redirect, setRedirect] = createSignal(false);
  createEffect(() => {
    const t = setTimeout(() => setRedirect(true), 3000);
    onCleanup(() => clearTimeout(t));
  });
  return (
    <div class="p-4">
      <Show
        when={redirect()}
        fallback={
          <span>
            You must be signed in to view this page. Redirecting you to the sign in page...
          </span>
        }
      >
        <RedirectToSignIn />
      </Show>
    </div>
  );
}
