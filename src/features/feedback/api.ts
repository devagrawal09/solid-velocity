import { action, cache } from '@solidjs/router';
import { assertRequestAuth } from '~/auth';
import { Rating, getSession, rateSession, reviewSession } from './store';
import { db } from '~/db/drizzle';

export const rateSessionFn = action(async (data: { sessionId: string; rating: Rating }) => {
  'use server';

  const { userId } = assertRequestAuth();
  const result = await db.transaction(tx => rateSession({ ...data, userId }, tx));
  return result;
});

export const reviewSessionFn = action(async (data: { sessionId: string; review: string }) => {
  'use server';

  const { userId } = assertRequestAuth();
  const result = await db.transaction(tx => reviewSession({ ...data, userId }, tx));
  return result;
});

export const getSessionFeedback = cache(async (sessionId: string) => {
  'use server';

  const { userId } = assertRequestAuth();
  const session = await db.transaction(tx => getSession({ sessionId, userId }, tx));
  return session;
}, 'session-feedback');
