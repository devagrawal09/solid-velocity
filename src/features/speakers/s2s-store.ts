import { action, cache, redirect, reload } from '@solidjs/router';
import { getRequestAuth } from '~/auth';
import {
  getSignedUpSpeakers,
  getSpeakerAssignments,
  updateSignedUpSpeakers,
  updateSpeakerAssignments
} from './db';

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
}, 's2s/assignees');

export const signUpSpeakerFn = action(async () => {
  'use server';

  const speakerId = await getRequestSpeakerFn();

  const signedUpSpeakers = (await getSignedUpSpeakers()) || [];

  if (signedUpSpeakers && signedUpSpeakers.includes(speakerId)) {
    throw new Error('Speaker already signed up');
  }

  await updateSignedUpSpeakers([speakerId, ...signedUpSpeakers]);
});

export const toggleAssignmentFn = action(async (sessionId: string) => {
  'use server';

  const speakerId = await getRequestSpeakerFn();

  const speakerAssignedSessions = (await getSpeakerAssignments(speakerId)) || [];

  if (speakerAssignedSessions.includes(sessionId)) {
    await updateSpeakerAssignments(
      speakerId,
      speakerAssignedSessions.filter(s => s !== sessionId)
    );
  }

  await updateSpeakerAssignments(speakerId, [sessionId, ...speakerAssignedSessions]);

  return reload({ revalidate: getSignedUpSpeakersFn.key });
});
