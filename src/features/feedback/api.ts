import { action, cache } from '@solidjs/router';
import { getRequestAuth } from '~/auth';
import { Rating, getSession, rateSession, reviewSession } from './store';

export const rateSessionFn = action(async (data: { sessionId: string; rating: Rating }) => {
  'use server';

  const auth = getRequestAuth();
  if (!auth?.userId) return;

  const userId = auth.userId;
  const result = await rateSession({ ...data, userId });
  return result;
});

export const reviewSessionFn = action(async (data: { sessionId: string; review: string }) => {
  'use server';

  const auth = getRequestAuth();
  if (!auth?.userId) return;

  const userId = auth.userId;
  const result = await reviewSession({ ...data, userId });
  return result;
});

export const getSessionFeedback = cache(async (sessionId: string) => {
  'use server';

  const auth = getRequestAuth();
  if (!auth?.userId) return;

  const userId = auth.userId;
  const session = await getSession({ userId, sessionId });
  return session;
}, 'session-feedback');
