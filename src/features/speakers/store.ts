import { getCachedData } from '../sessionize/store';
import { json, pgTable, PgTransaction, text, uuid } from 'drizzle-orm/pg-core';

type SpeakerEventData =
  | { type: 'session-assigned'; sessionId: string }
  | { type: 'session-unassigned'; sessionId: string }
  | { type: 'speaker-signedup' }
  | { type: 'speaker-removed' };

export const speakerFeedbackEvents = pgTable(`speaker-feedback-events`, {
  id: uuid(`id`).defaultRandom().primaryKey(),
  speakerId: text(`speakerId`).notNull(),
  feedback: json('feedback').$type<SpeakerEventData>().notNull()
});

export type SpeakerEvent = typeof speakerFeedbackEvents.$inferInsert;

async function getSpeakerEvents(tx: PgTransaction<any, any, any>) {
  return tx.select().from(speakerFeedbackEvents);
}

async function publishSpeakerEvent(events: SpeakerEvent[], tx: PgTransaction<any, any, any>) {
  await tx.insert(speakerFeedbackEvents).values(events);
  return events;
}

export async function getSpeakerAssignments(speakerId: string, tx: PgTransaction<any, any, any>) {
  const events = await getSpeakerEvents(tx);

  return events.reduce((acc, event) => {
    if (event.feedback.type === 'session-assigned' && event.speakerId === speakerId) {
      return [...acc, event.feedback.sessionId];
    }

    if (event.feedback.type === 'session-unassigned' && event.speakerId === speakerId) {
      const sessionId = event.feedback.sessionId;
      return acc.filter(s => s !== sessionId);
    }

    return acc;
  }, [] as string[]);
}

export async function getSignedUpSpeakers(tx: PgTransaction<any, any, any>) {
  const events = await getSpeakerEvents(tx);

  return events.reduce((acc, event) => {
    if (event.feedback.type === 'speaker-signedup') {
      return [...acc, event.speakerId];
    }

    if (event.feedback.type === 'speaker-removed') {
      return acc.filter(s => s !== event.speakerId);
    }

    return acc;
  }, [] as string[]);
}

export async function getSessionAssignees(sessionId: string, tx: PgTransaction<any, any, any>) {
  const events = await getSpeakerEvents(tx);

  return events.reduce((acc, event) => {
    if (event.feedback.type === 'session-assigned' && event.feedback.sessionId === sessionId) {
      return [...acc, event.speakerId];
    }

    if (event.feedback.type === 'session-unassigned' && event.feedback.sessionId === sessionId) {
      return acc.filter(s => s !== event.speakerId);
    }

    return acc;
  }, [] as string[]);
}

export async function signUpSpeaker(speakerId: string, tx: PgTransaction<any, any, any>) {
  const signedUpSpeakers = await getSignedUpSpeakers(tx);
  if (signedUpSpeakers.includes(speakerId)) return new Error('Speaker already signed up');

  return publishSpeakerEvent([{ feedback: { type: 'speaker-signedup' }, speakerId }], tx);
}

export async function assignSpeakerToSession(
  {
    speakerId,
    sessionId
  }: {
    speakerId: string;
    sessionId: string;
  },
  tx: PgTransaction<any, any, any>
) {
  const speakerAssignedSessions = await getSpeakerAssignments(speakerId, tx);
  if (speakerAssignedSessions.includes(sessionId))
    return new Error('Speaker already assigned to session');

  return publishSpeakerEvent(
    [{ feedback: { type: 'session-assigned', sessionId }, speakerId }],
    tx
  );
}

export async function unassignSpeakerFromSession(
  {
    speakerId,
    sessionId
  }: {
    speakerId: string;
    sessionId: string;
  },
  tx: PgTransaction<any, any, any>
) {
  const speakerAssignedSessions = await getSpeakerAssignments(speakerId, tx);
  if (!speakerAssignedSessions.includes(sessionId))
    return new Error('Speaker not assigned to session');

  return publishSpeakerEvent(
    [{ feedback: { type: 'session-unassigned', sessionId }, speakerId }],
    tx
  );
}

export async function removeSpeaker(speakerId: string, tx: PgTransaction<any, any, any>) {
  const signedUpSpeakers = await getSignedUpSpeakers(tx);
  if (!signedUpSpeakers.includes(speakerId)) return new Error('Speaker not signed up');

  const session = await getSessionForSpeaker(speakerId);

  if (!session) return new Error('Invalid speaker id');

  const [unassignsToMySession, unassignsMe] = await Promise.all([
    clearSessionAssignments(session.id, tx),
    clearSpeakerAssignments(speakerId, tx)
  ]);

  return publishSpeakerEvent(
    [{ feedback: { type: 'speaker-removed' }, speakerId }, ...unassignsToMySession, ...unassignsMe],
    tx
  );
}

async function getSessionForSpeaker(speakerId: string) {
  const sessionizeData = await getCachedData();
  return sessionizeData!.sessions.find(s => s.speakers.includes(speakerId));
}

async function clearSpeakerAssignments(speakerId: string, tx: PgTransaction<any, any, any>) {
  const assignments = await getSpeakerAssignments(speakerId, tx);

  return assignments.map(sessionId => ({
    feedback: { type: 'session-unassigned' as const, sessionId },
    speakerId
  }));
}

async function clearSessionAssignments(sessionId: string, tx: PgTransaction<any, any, any>) {
  const sessionAssignees = await getSessionAssignees(sessionId, tx);

  return sessionAssignees.map(speakerId => ({
    feedback: { type: 'session-unassigned' as const, sessionId },
    speakerId
  }));
}
