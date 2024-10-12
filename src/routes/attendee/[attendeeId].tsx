import { cache, redirect, RouteDefinition } from '@solidjs/router';

const scanAttendee = cache(async (attendeeId: string) => {
  'use server';

  // fetch profile for current user
  // if profile doesn't exist create it
  // get name and avatar url from Clerk
  // TODO: add attendeeId to connecions using current user profile id

  return redirect(`/attendee`);
}, `scanAttendee`);

export const route = {
  preload({ params }) {
    scanAttendee(params.attendeeId);
  }
} satisfies RouteDefinition;
