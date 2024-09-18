import { json, pgTable, PgTransaction, text, uuid, timestamp } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { getCachedData } from '../sessionize/store';
import { asc } from 'drizzle-orm';

export const speakerFeedbackFormSchema = z.object({
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  why: z.string().min(5),
  fav: z.string().min(5),
  improve: z.string().min(5),
  comments: z.string().min(5)
});
export type SpeakerFeedbackFormData = z.infer<typeof speakerFeedbackFormSchema>;

type SpeakerEventData =
  | { type: 'session-assigned'; sessionId: string }
  | { type: 'session-unassigned'; sessionId: string }
  | { type: 'speaker-signedup' }
  | { type: 'speaker-removed' }
  | { type: 'session-feedback'; sessionId: string; data: SpeakerFeedbackFormData };

export const speakerFeedbackEvents = pgTable(`speaker-feedback-events`, {
  id: uuid(`id`).defaultRandom().primaryKey(),
  speakerId: text(`speakerId`).notNull(),
  feedback: json('feedback').$type<SpeakerEventData>().notNull(),
  timestamp: timestamp(`timestamp`).defaultNow().notNull()
});

export type SpeakerEvent = typeof speakerFeedbackEvents.$inferInsert;

async function getSpeakerEvents(tx: PgTransaction<any, any, any>) {
  return tx.select().from(speakerFeedbackEvents).orderBy(asc(speakerFeedbackEvents.timestamp));
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

export async function getAllAssignments(tx: PgTransaction<any, any, any>) {
  const events = await getSpeakerEvents(tx);

  return events.reduce(
    (acc, event) => {
      if (event.feedback.type === 'session-assigned') {
        const sessionId = event.feedback.sessionId;

        return {
          ...acc,
          [sessionId]: [...(acc[sessionId] || []), event.speakerId]
        };
      }

      if (event.feedback.type === 'session-unassigned') {
        const sessionId = event.feedback.sessionId;

        return {
          ...acc,
          [sessionId]: (acc[sessionId] || []).filter(s => s !== event.speakerId)
        };
      }

      return acc;
    },
    {} as Record<string, string[]>
  );
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
  try {
    const data = await getCachedData();
    const session = data.sessions.find(s => s.id === sessionId)!;

    const speakerAssignedSessions = await getSpeakerAssignments(speakerId, tx);

    if (speakerAssignedSessions.includes(sessionId))
      return new Error('Speaker already assigned to session');

    if (speakerAssignedSessions.length > 1)
      return new Error('Speaker already assigned to two sessions');

    const timeSlot = session.startsAt!;
    const assignedTimeSlots = speakerAssignedSessions.map(
      id => data.sessions.find(s => s.id === id)!.startsAt!
    );
    if (assignedTimeSlots.includes(timeSlot))
      return new Error('Speaker already assigned to a session at the same time');

    return publishSpeakerEvent(
      [{ feedback: { type: 'session-assigned', sessionId }, speakerId }],
      tx
    );
  } catch (err: any) {
    return new Error(`Internal error: ${err.message}`);
  }
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

export async function getFeedback(
  {
    speakerId,
    sessionId
  }: {
    speakerId: string;
    sessionId: string;
  },
  tx: PgTransaction<any, any, any>
) {
  const events = await getSpeakerEvents(tx);

  return events.filter(
    event =>
      event.feedback.type === 'session-feedback' &&
      event.feedback.sessionId === sessionId &&
      event.speakerId === speakerId
  );
}

export async function submitFeedback(
  {
    speakerId,
    sessionId,
    data
  }: {
    speakerId: string;
    sessionId: string;
    data: SpeakerFeedbackFormData;
  },
  tx: PgTransaction<any, any, any>
) {
  return publishSpeakerEvent(
    [{ feedback: { type: 'session-feedback', sessionId, data }, speakerId }],
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
