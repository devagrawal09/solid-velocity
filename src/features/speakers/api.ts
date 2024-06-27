import { action, cache, redirect } from '@solidjs/router';
import { getRequestAuth } from '~/auth';
import {
  assignSpeakerToSession,
  getSessionAssignees,
  getSignedUpSpeakers,
  getSpeakerAssignments,
  signUpSpeaker,
  unassignSpeakerFromSession,
  removeSpeaker
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

  const speakers = await getSignedUpSpeakers();

  if (speakers && speakers.includes(speakerId)) {
    return speakers;
  }

  return [];
}, 's2s/speakers');

export const getSpeakerAssignmentsFn = cache(async () => {
  'use server';

  const speakerId = await getRequestSpeakerFn();

  const assignments = await getSpeakerAssignments(speakerId);

  return assignments || [];
}, 's2s/assignments');

export const getSessionAssigneesFn = cache(async (sessionId: string) => {
  'use server';

  const speakerId = await getRequestSpeakerFn();

  const assignees = await getSessionAssignees(sessionId);

  return assignees || [];
}, 's2s/assignees');

export const signUpSpeakerFn = action(async () => {
  'use server';

  const speakerId = await getRequestSpeakerFn();

  const result = await signUpSpeaker(speakerId);

  return result;
});

export const assignToSessionFn = action(async (sessionId: string) => {
  'use server';

  const speakerId = await getRequestSpeakerFn();

  const result = await assignSpeakerToSession({ speakerId, sessionId });

  return result;
});

export const unassignFromSessionFn = action(async (sessionId: string) => {
  'use server';

  const speakerId = await getRequestSpeakerFn();

  const result = await unassignSpeakerFromSession({ speakerId, sessionId });

  return result;
});

export const removeSpeakerFn = action(async () => {
  'use server';

  const speakerId = await getRequestSpeakerFn();

  const result = await removeSpeaker(speakerId);

  return result;
});
