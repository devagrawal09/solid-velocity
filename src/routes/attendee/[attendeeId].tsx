import { clerkClient } from '@clerk/clerk-sdk-node';
import { cache, redirect, RouteDefinition } from '@solidjs/router';
import { assertRequestAuth } from '~/auth';
import { db } from '~/db/drizzle';
import { attendeeProfiles, connectionTable } from '~/db/schema';

const visitAttendee = cache(async (attendeeId: string) => {
  'use server';

  // add attendeeId to connecions using current user profile id
  const { userId } = assertRequestAuth();
  const visitedProfile = await db.query.attendeeProfiles.findFirst({
    where: (attendee, { eq }) => eq(attendee.id, attendeeId)
  });

  if (!visitedProfile) {
    return redirect(`/attendee?status=notfound`);
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
    return redirect(`/attendee?status=notfound`);
  }

  const [connection] = await db
    .insert(connectionTable)
    .values([{ to: attendeeId, from: profile.id }])
    .returning()
    .onConflictDoNothing();

  if (!connection) {
    return redirect('/attendee?status=alreadyconnected');
  }

  return redirect(`/attendee?status=success`);
}, `visitAttendee`);

export const route = {
  preload({ params }) {
    visitAttendee(params.attendeeId);
  }
} satisfies RouteDefinition;

export default function AttendeeView() {
  return (
    <div class="p-4">
      Connecting attendee{' '}
      <span role="img" aria-label="globe">
        🌍
      </span>
    </div>
  );
}
