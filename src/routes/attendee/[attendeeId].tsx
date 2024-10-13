import { cache, redirect, RouteDefinition } from '@solidjs/router';
import { assertRequestAuth } from '~/auth';
import { db } from '~/db/drizzle';
import { connectionTable } from '~/db/schema';

const scanAttendee = cache(async (attendeeId: string) => {
  'use server';

  // add attendeeId to connecions using current user profile id
  const { userId } = assertRequestAuth();
  // Find the profile id associated with this user
  const profile = await db.query.attendeeProfiles.findFirst({
    where: (attendee, { eq }) => eq(attendee.userId, userId)
  });
  if (profile) {
    await db.insert(connectionTable).values([{ to: attendeeId, from: profile.id }]);
  }

  return redirect(`/attendee`);
}, `scanAttendee`);

export const route = {
  preload({ params }) {
    scanAttendee(params.attendeeId);
  }
} satisfies RouteDefinition;
