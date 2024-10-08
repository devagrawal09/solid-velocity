import { action, cache, redirect } from '@solidjs/router';
import { assertRequestAdmin, getRequestAuth } from '~/auth';
import { db } from '~/db/drizzle';
import {
  assignSpeakerToSession,
  getAllAssignments,
  getFeedback,
  getSessionAssignees,
  getSignedUpSpeakers,
  getSpeakerAssignments,
  removeSpeaker,
  signUpSpeaker,
  SpeakerFeedbackFormData,
  submitFeedback,
  unassignSpeakerFromSession
} from './store';

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

export const signUpSpeakerFn = action(async () => {
  'use server';

  const speakerId = await getRequestSpeakerFn();

  const result = await db.transaction(tx => signUpSpeaker(speakerId, tx));

  return result;
});

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
