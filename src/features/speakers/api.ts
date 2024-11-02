import { action, cache, redirect } from '@solidjs/router';
import { assertRequestAdmin, getRequestAuth } from '~/auth';
import { db } from '~/db/drizzle';
import {
  approveFeedback,
  assignSpeakerToSession,
  getAllAssignments,
  getFeedback,
  getFeedbackForSession,
  getSessionAssignees,
  getSignedUpSpeakers,
  getSpeakerAssignments,
  getSpeakerStats,
  removeSpeaker,
  signUpSpeaker,
  SpeakerFeedbackFormData,
  submitFeedback,
  unassignSpeakerFromSession,
  updateSpeakerStats
} from './store';
import { getSessionizeData } from '../sessionize/api';
import { getCachedData } from '../sessionize/store';

export const getRequestSpeakerFn = cache(async () => {
  'use server';

  const auth = getRequestAuth();
  if (auth?.userId) {
    const speakerId = auth.sessionClaims.publicMetadata.speakerId;
    if (speakerId) return speakerId;
  }

  throw redirect('/');
}, 's2s/speakerId');

export const getSignedUpSpeakersFn = cache(async () => {
  'use server';

  const speakerId = await getRequestSpeakerFn();

  const speakers = await db.transaction(tx => getSignedUpSpeakers(tx));

  if (speakers && speakers.includes(speakerId)) {
    return speakers;
  }

  return [];
}, 's2s/speakers');

export const getSpeakerAssignmentsFn = cache(async () => {
  'use server';

  const speakerId = await getRequestSpeakerFn();

  const assignments = await db.transaction(tx => getSpeakerAssignments(speakerId, tx));

  return assignments || [];
}, 's2s/assignments');

export const getSessionAssigneesFn = cache(async (sessionId: string) => {
  'use server';

  const speakerId = await getRequestSpeakerFn();

  const assignees = await db.transaction(tx => getSessionAssignees(sessionId, tx));

  return assignees || [];
}, 's2s/assignees');

export const getAllAssignmentsFn = cache(async () => {
  'use server';

  const speakerId = await getRequestSpeakerFn();

  const assignments = await db.transaction(tx => getAllAssignments(tx));

  return assignments;
}, 's2s/all-assignments');

export const getFeedbackFn = cache(async (sessionId: string) => {
  'use server';

  const speakerId = await getRequestSpeakerFn();

  const result = await db.transaction(tx => getFeedback({ speakerId, sessionId }, tx));

  return result;
}, 's2s/feedback');

export const getAllFeedbackFn = cache(async () => {
  'use server';

  const speakerId = await getRequestSpeakerFn();
  const data = await getSessionizeData();
  const session = data.sessions.find(s => s.speakers.includes(speakerId));
  if (!session) return [];

  const result = await db.transaction(tx => getFeedbackForSession({ sessionId: session.id }, tx));

  return result;
}, 's2s/all-feedback');

export const signUpSpeakerFn = action(async () => {
  'use server';

  const speakerId = await getRequestSpeakerFn();

  const result = await db.transaction(tx => signUpSpeaker(speakerId, tx));

  return result;
});

export const approveFeedbackFn = action(
  async ({ speakerId, sessionId }: { speakerId: string; sessionId: string }) => {
    'use server';

    const { userId } = assertRequestAdmin();

    const result = await db.transaction(tx =>
      approveFeedback({ speakerId, sessionId, by: userId }, tx)
    );

    return result;
  }
);

export const assignToSessionFn = action(async (sessionId: string) => {
  'use server';

  const speakerId = await getRequestSpeakerFn();

  const result = await db.transaction(tx => assignSpeakerToSession({ speakerId, sessionId }, tx));

  return result;
});

export const unassignFromSessionFn = action(async (sessionId: string) => {
  'use server';

  assertRequestAdmin();

  const speakerId = await getRequestSpeakerFn();

  const result = await db.transaction(tx =>
    unassignSpeakerFromSession({ speakerId, sessionId }, tx)
  );

  return result;
});

export const removeSpeakerFn = action(async () => {
  'use server';

  assertRequestAdmin();

  const speakerId = await getRequestSpeakerFn();

  const result = await db.transaction(tx => removeSpeaker(speakerId, tx));

  return result;
});

export const submitFeedbackFn = action(
  async ({ sessionId, data }: { sessionId: string; data: SpeakerFeedbackFormData }) => {
    'use server';

    const speakerId = await getRequestSpeakerFn();

    const result = await db.transaction(tx => submitFeedback({ speakerId, sessionId, data }, tx));

    return result;
  }
);

export const getCurrentSpeakerStatsFn = cache(async () => {
  'use server';

  const speakerId = await getRequestSpeakerFn();
  const sessionizeData = await getCachedData();
  const session = sessionizeData.sessions.find(s => s.speakers.includes(speakerId));
  if (!session) throw new Error('Session not found');

  const result = await db.transaction(tx => getSpeakerStats({ sessionId: session.id }, tx));

  if (result.length === 0) return null;

  return result[0];
}, 'current-speaker-stats');

export const getAllSpeakerStatsFn = cache(async () => {
  'use server';

  assertRequestAdmin();

  const result = await db.transaction(tx => getSpeakerStats({}, tx));

  if (result.length === 0) return null;

  return result;
}, 'all-speaker-stats');

export const updateSpeakerStatsFn = action(
  async (data: { sessionId: string; attendeeCount: string }) => {
    'use server';

    assertRequestAdmin();

    await db.transaction(tx => updateSpeakerStats(data, tx));

    return data.sessionId;
  }
);
