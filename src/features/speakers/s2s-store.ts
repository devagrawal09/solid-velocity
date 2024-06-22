import { action, cache, redirect } from '@solidjs/router';
import { getRequestAuth } from '~/auth';
import { storage } from '~/db';

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

  const speakers = await storage.getItem<string[]>('s2s/speakers');

  return speakers || [];
}, 's2s/speakers');

export const getSpeakerAssignmentsFn = cache(async () => {
  'use server';

  const speakerId = await getRequestSpeakerFn();

  const assignments = await storage.getItem<string[]>(`s2s/${speakerId}`);

  return assignments || [];
}, 's2s/assignments');

export const signUpSpeakerFn = action(async () => {
  'use server';

  const speakerId = await getRequestSpeakerFn();

  const signedUpSpeakers = (await storage.getItem<string[]>('s2s/speakers')) || [];

  if (signedUpSpeakers && signedUpSpeakers.includes(speakerId)) {
    throw new Error('Speaker already signed up');
  }

  await storage.setItem('s2s/speakers', [speakerId, ...signedUpSpeakers]);
});

export const toggleAssignmentFn = action(async (sessionId: string) => {
  'use server';

  const speakerId = await getRequestSpeakerFn();

  const speakerAssignedSessions = (await storage.getItem<string[]>(`s2s/${speakerId}`)) || [];

  if (speakerAssignedSessions.includes(sessionId)) {
    return storage.setItem(
      `s2s/${speakerId}`,
      speakerAssignedSessions.filter(s => s !== sessionId)
    );
  }

  await storage.setItem(`s2s/${speakerId}`, [sessionId, ...speakerAssignedSessions]);
});
