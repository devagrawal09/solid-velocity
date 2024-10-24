import { action, cache } from '@solidjs/router';
import { assertRequestAdmin, assertRequestAuth } from '~/auth';
import {
  Rating,
  approveAttendeeFeedback,
  getAllSessionFeedback,
  getSession,
  getSessionFeedback,
  rateSession,
  reviewSession
} from './store';
import { db } from '~/db/drizzle';
import { getRequestSpeakerFn } from '../speakers/api';
import { getSessionizeData } from '../sessionize/api';

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

export const getAttendeeSessionFeedback = cache(async (sessionId: string) => {
  'use server';

  const { userId } = assertRequestAuth();
  const session = await db.transaction(tx => getSession({ sessionId, userId }, tx));
  return session;
}, 'session-attendee-feedback');

export const getSpeakerSessionFeedback = cache(async () => {
  'use server';

  const speakerId = await getRequestSpeakerFn();
  const data = await getSessionizeData();
  const session = data.sessions.find(s => s.speakers.includes(speakerId));
  if (!session) return [];
  const feedback = await db.transaction(tx => getSessionFeedback(session.id, tx));
  return feedback.filter(f => f.approved);
}, 'session-speaker-feedback');

export const getAllSessionFeedbackFn = cache(async () => {
  'use server';

  assertRequestAdmin();
  const events = await db.transaction(tx => getAllSessionFeedback(tx));
  return events;
}, 'session-all-feedback');

export const approveAttendeeFeedbackFn = action(
  async ({ userId, sessionId }: { userId: string; sessionId: string }) => {
    'use server';

    const { userId: by } = assertRequestAdmin();
    await db.transaction(tx => approveAttendeeFeedback({ userId, sessionId, by }, tx));
  }
);
