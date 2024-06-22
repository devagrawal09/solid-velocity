import { storage } from '~/db';

export type SpeakerEvents = { type: 'assign-session'; speakerId: string; sessionId: string };

export function updateSpeakerAssignments(speakerId: string, sessions: string[]) {
  return storage.setItem(`s2s/speaker/${speakerId}`, sessions);
}

export function getSpeakerAssignments(speakerId: string) {
  return storage.getItem<string[]>(`s2s/speaker/${speakerId}`);
}

export function getSignedUpSpeakers() {
  return storage.getItem<string[]>('s2s/speakers');
}

export function updateSignedUpSpeakers(speakers: string[]) {
  return storage.setItem('s2s/speakers', speakers);
}
