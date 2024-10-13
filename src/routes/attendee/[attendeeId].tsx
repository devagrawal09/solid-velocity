import { clerkClient } from '@clerk/clerk-sdk-node';
import { cache, redirect, RouteDefinition } from '@solidjs/router';
import { assertRequestAuth } from '~/auth';
import { db } from '~/db/drizzle';
import { attendeeProfiles, connectionTable } from '~/db/schema';

const scanAttendee = cache(async (attendeeId: string) => {
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

  const [connection] = await db
    .insert(connectionTable)
    .values([{ to: attendeeId, from: profile.id }])
    .onConflictDoNothing({ target: [connectionTable.from, connectionTable.to] })
    .returning();

  if (!connection) {
    return redirect('/attendee?status=alreadyconnected');
  }

  return redirect(`/attendee?status=success`);
}, `scanAttendee`);

export const route = {
  preload({ params }) {
    scanAttendee(params.attendeeId);
  }
} satisfies RouteDefinition;

export default function AttendeeView() {
  return <div>View attendee</div>;
}
