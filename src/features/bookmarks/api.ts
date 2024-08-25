import { action, cache } from '@solidjs/router';
import { getRequestAuth } from '~/auth';
import { bookmarkSession, getBookmarkedSessions, unbookmarkSession } from './store';
import { db } from '~/db/drizzle';

export const getUserBookmarks = cache(async () => {
  'use server';

  const auth = getRequestAuth();

  if (auth?.userId) {
    const { userId } = auth;
    const data = await db.transaction(tx => getBookmarkedSessions(userId, tx));

    return data;
  }

  return [];
}, 'bookmarks');

export const bookmarkSessionFn = action(async (sessionId: string) => {
  'use server';

  const auth = getRequestAuth();

  if (auth?.userId) {
    const { userId } = auth;
    const result = await db.transaction(tx => bookmarkSession({ userId, sessionId }, tx));

    return result;
  }
});

export const unbookmarkSessionFn = action(async (sessionId: string) => {
  'use server';

  const auth = getRequestAuth();

  if (auth?.userId) {
    const { userId } = auth;
    const result = await db.transaction(tx => unbookmarkSession({ userId, sessionId }, tx));

    return result;
  }
});
