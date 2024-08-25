import { and, eq } from 'drizzle-orm';
import { json, pgTable, PgTransaction, text, uuid } from 'drizzle-orm/pg-core';

export type Rating = 0 | 1 | 2;

export const attendeeFeedbackEvents = pgTable(`attendee-feedback-events`, {
  id: uuid(`id`).defaultRandom().primaryKey(),
  userId: text(`userId`).notNull(),
  sessionId: text(`sessionId`).notNull(),
  feedback: json('feedback')
    .$type<{ type: 'rated'; rating: Rating } | { type: 'reviewed'; review: string }>()
    .notNull()
});

export type FeedbackEvent = typeof attendeeFeedbackEvents.$inferInsert;

async function getFeedbackEvents(
  { userId, sessionId }: { userId: string; sessionId: string },
  tx: PgTransaction<any, any, any>
) {
  return tx
    .select()
    .from(attendeeFeedbackEvents)
    .where(
      and(
        eq(attendeeFeedbackEvents.userId, userId),
        eq(attendeeFeedbackEvents.sessionId, sessionId)
      )
    );
}

async function publishFeedbackEvent(events: FeedbackEvent[], tx: PgTransaction<any, any, any>) {
  await tx.insert(attendeeFeedbackEvents).values(events);
  return events;
}

export async function rateSession(
  {
    userId,
    sessionId,
    rating
  }: {
    userId: string;
    sessionId: string;
    rating: Rating;
  },
  tx: PgTransaction<any, any, any>
) {
  return publishFeedbackEvent([{ feedback: { type: 'rated', rating }, userId, sessionId }], tx);
}

export async function reviewSession(
  {
    userId,
    sessionId,
    review
  }: {
    userId: string;
    sessionId: string;
    review: string;
  },
  tx: PgTransaction<any, any, any>
) {
  return publishFeedbackEvent([{ feedback: { type: 'reviewed', review }, userId, sessionId }], tx);
}

export async function getSession(
  { userId, sessionId }: { userId: string; sessionId: string },
  tx: PgTransaction<any, any, any>
) {
  const events = await getFeedbackEvents({ userId, sessionId }, tx);

  return events.reduce(
    (acc, event) => {
      if (event.feedback.type === 'rated') {
        return { ...acc, rating: event.feedback.rating };
      }

      if (event.feedback.type === 'reviewed') {
        return { ...acc, review: event.feedback.review };
      }

      return acc;
    },
    {} as { rating?: Rating; review?: string }
  );
}
