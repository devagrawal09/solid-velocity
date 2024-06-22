'use server';

import { action, cache } from '@solidjs/router';
import { getRequestAuth } from '~/auth';
import { storage } from '~/db';

function getRequestSpeaker() {
  'use server';

  const auth = getRequestAuth();

  if (auth?.userId) {
    const speakerId = auth.sessionClaims.publicMetadata.speakerId;
    if (speakerId) return speakerId;
  }

  throw new Error('Invalid Request');
}

export const getSignedUpSpeakersFn = cache(async () => {
  'use server';

  const speakerId = getRequestSpeaker();
  const speakers = await storage.getItem<string[]>('s2s/speakers');
  return speakers || [];
}, 's2s/speakers');

export const getSpeakerAssignmentsFn = cache(async () => {
  'use server';

  const speakerId = getRequestSpeaker();
  const assignments = await storage.getItem<string[]>(`s2s/${speakerId}`);
  return assignments || [];
}, 's2s/assignments');

export const signUpSpeakerFn = action(async () => {
  'use server';

  const speakerId = getRequestSpeaker();

  const signedUpSpeakers = (await storage.getItem<string[]>('s2s/speakers')) || [];

  if (signedUpSpeakers && signedUpSpeakers.includes(speakerId)) {
    throw new Error('Speaker already signed up');
  }

  await storage.setItem('s2s/speakers', [speakerId, ...signedUpSpeakers]);
});

export const toggleAssignmentFn = action(async (sessionId: string) => {
  'use server';

  const speakerId = getRequestSpeaker();

  const speakerAssignedSessions = (await storage.getItem<string[]>(`s2s/${speakerId}`)) || [];

  if (speakerAssignedSessions.includes(sessionId)) {
    return storage.setItem(
      `s2s/${speakerId}`,
      speakerAssignedSessions.filter(s => s !== sessionId)
    );
  }

  await storage.setItem(`s2s/${speakerId}`, [sessionId, ...speakerAssignedSessions]);
});
