import { storage } from '~/db';
import { getCachedData } from '../sessionize/store';

export type SpeakerEvent =
  | { type: 'session-assigned'; speakerId: string; sessionId: string }
  | { type: 'session-unassigned'; speakerId: string; sessionId: string }
  | { type: 'speaker-signedup'; speakerId: string }
  | { type: 'speaker-removed'; speakerId: string };

async function getSpeakerEvents() {
  return (await storage.getItem<SpeakerEvent[]>('s2s/events')) || [];
}

async function publishSpeakerEvent(events: SpeakerEvent[]) {
  const existingEvents = await getSpeakerEvents();
  storage.setItem('s2s/events', [...existingEvents, ...events]);
  return events;
}

export async function getSpeakerAssignments(speakerId: string) {
  const events = await getSpeakerEvents();

  return events.reduce((acc, event) => {
    if (event.type === 'session-assigned' && event.speakerId === speakerId) {
      return [...acc, event.sessionId];
    }

    if (event.type === 'session-unassigned' && event.speakerId === speakerId) {
      return acc.filter(s => s !== event.sessionId);
    }

    return acc;
  }, [] as string[]);
}

export async function getSignedUpSpeakers() {
  const events = await getSpeakerEvents();

  return events.reduce((acc, event) => {
    if (event.type === 'speaker-signedup') {
      return [...acc, event.speakerId];
    }

    if (event.type === 'speaker-removed') {
      return acc.filter(s => s !== event.speakerId);
    }

    return acc;
  }, [] as string[]);
}

export async function getSessionAssignees(sessionId: string) {
  const events = await getSpeakerEvents();

  return events.reduce((acc, event) => {
    if (event.type === 'session-assigned' && event.sessionId === sessionId) {
      return [...acc, event.speakerId];
    }

    if (event.type === 'session-unassigned' && event.sessionId === sessionId) {
      return acc.filter(s => s !== event.speakerId);
    }

    return acc;
  }, [] as string[]);
}

export async function signUpSpeaker(speakerId: string) {
  const signedUpSpeakers = await getSignedUpSpeakers();
  if (signedUpSpeakers.includes(speakerId)) return new Error('Speaker already signed up');

  return publishSpeakerEvent([{ type: 'speaker-signedup', speakerId }]);
}

export async function assignSpeakerToSession({
  speakerId,
  sessionId
}: {
  speakerId: string;
  sessionId: string;
}) {
  const speakerAssignedSessions = await getSpeakerAssignments(speakerId);
  if (speakerAssignedSessions.includes(sessionId))
    return new Error('Speaker already assigned to session');

  return publishSpeakerEvent([{ type: 'session-assigned', speakerId, sessionId }]);
}

export async function unassignSpeakerFromSession({
  speakerId,
  sessionId
}: {
  speakerId: string;
  sessionId: string;
}) {
  const speakerAssignedSessions = await getSpeakerAssignments(speakerId);
  if (!speakerAssignedSessions.includes(sessionId))
    return new Error('Speaker not assigned to session');

  return publishSpeakerEvent([{ type: 'session-unassigned', speakerId, sessionId }]);
}

export async function removeSpeaker(speakerId: string) {
  const signedUpSpeakers = await getSignedUpSpeakers();
  if (!signedUpSpeakers.includes(speakerId)) return new Error('Speaker not signed up');

  const session = await getSessionForSpeaker(speakerId);

  if (!session) return new Error('Invalid speaker id');

  const [unassignsToMySession, unassignsMe] = await Promise.all([
    clearSessionAssignments(session.id),
    clearSpeakerAssignments(speakerId)
  ]);

  return publishSpeakerEvent([
    { type: 'speaker-removed', speakerId },
    ...unassignsToMySession,
    ...unassignsMe
  ]);
}

async function getSessionForSpeaker(speakerId: string) {
  const sessionizeData = await getCachedData();
  return sessionizeData.sessions.find(s => s.speakers.includes(speakerId));
}

async function clearSpeakerAssignments(speakerId: string) {
  const assignments = await getSpeakerAssignments(speakerId);

  return assignments.map(sessionId => ({
    type: 'session-unassigned' as const,
    speakerId,
    sessionId
  }));
}

async function clearSessionAssignments(sessionId: string) {
  const sessionAssignees = await getSessionAssignees(sessionId);

  return sessionAssignees.map(speakerId => ({
    type: 'session-unassigned' as const,
    speakerId,
    sessionId
  }));
}
