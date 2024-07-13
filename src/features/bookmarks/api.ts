import { action, cache } from '@solidjs/router';
import { assertRequestAuth } from '~/auth';
import { bookmarkSession, getBookmarkedSessions, unbookmarkSession } from './store';

export const getUserBookmarks = cache(async () => {
  'use server';

  const { userId } = assertRequestAuth();

  const data = await getBookmarkedSessions(userId);

  return data;
}, 'bookmarks');

export const bookmarkSessionFn = action(async (sessionId: string) => {
  'use server';

  const { userId } = assertRequestAuth();

  const result = await bookmarkSession({ userId, sessionId });

  return result;
});

export const unbookmarkSessionFn = action(async (sessionId: string) => {
  'use server';

  const { userId } = assertRequestAuth();

  const result = await unbookmarkSession({ userId, sessionId });

  return result;
});
