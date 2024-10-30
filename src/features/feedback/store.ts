import { and, eq } from 'drizzle-orm';
import { json, pgTable, PgTransaction, text, uuid } from 'drizzle-orm/pg-core';

export type Rating = 0 | 1 | 2;

export const attendeeFeedbackEvents = pgTable(`attendee-feedback-events`, {
  id: uuid(`id`).defaultRandom().primaryKey(),
  userId: text(`userId`).notNull(),
  sessionId: text(`sessionId`).notNull(),
  feedback: json('feedback')
    .$type<
      | { type: 'rated'; rating: Rating }
      | { type: 'reviewed'; review: string }
      | { type: 'approved'; by: string }
      | { type: 'unapproved'; by: string }
    >()
    .notNull()
});

export type FeedbackEvent = typeof attendeeFeedbackEvents.$inferInsert;

async function getFeedbackEvents(
  { userId, sessionId }: { userId?: string; sessionId?: string },
  tx: PgTransaction<any, any, any>
) {
  return tx
    .select()
    .from(attendeeFeedbackEvents)
    .where(
      and(
        userId ? eq(attendeeFeedbackEvents.userId, userId) : undefined,
        sessionId ? eq(attendeeFeedbackEvents.sessionId, sessionId) : undefined
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

export async function getSessionFeedback(sessionId: string, tx: PgTransaction<any, any, any>) {
  const events = await getFeedbackEvents({ sessionId }, tx);

  return events
    .reduce(
      (acc, event) => {
        const existing = acc.find(x => x.userId === event.userId);
        if (existing) {
          if (event.feedback.type === 'rated') {
            existing.rating = event.feedback.rating;
          }

          if (event.feedback.type === 'reviewed') {
            existing.review = event.feedback.review;
          }

          if (event.feedback.type === 'approved') {
            existing.approved = true;
          }

          if (event.feedback.type === 'unapproved') {
            existing.approved = false;
          }

          return acc;
        }
        return [...acc, { userId: event.userId, ...event.feedback, approved: false }];
      },
      [] as { rating?: Rating; review?: string; userId: string; approved: boolean }[]
    )
    .map(({ userId, ...rest }) => rest)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .sort((a, b) => (b.review?.length || 0) - (a.review?.length || 0));
}

export async function getAllSessionFeedback(tx: PgTransaction<any, any, any>) {
  const events = await getFeedbackEvents({}, tx);

  return events;
}

export async function approveAttendeeFeedback(
  { userId, sessionId, by }: { userId: string; sessionId: string; by: string },
  tx: PgTransaction<any, any, any>
) {
  return publishFeedbackEvent([{ feedback: { type: 'approved', by }, userId, sessionId }], tx);
}

export async function approveAllAttendeeFeedback(by: string, tx: PgTransaction<any, any, any>) {
  const events = await getAllSessionFeedback(tx);

  const unapprovedFeedback = events
    .reduce(
      (acc, event) => {
        const existing = acc.find(
          x => x.userId === event.userId && x.sessionId === event.sessionId
        );

        if (existing) {
          if (event.feedback.type === 'approved') {
            existing.approved = true;
          }

          if (event.feedback.type === 'unapproved') {
            existing.approved = false;
          }

          return acc;
        }

        return [...acc, { ...event, approved: false }];
      },
      [] as { sessionId: string; userId: string; approved: boolean }[]
    )
    .filter(x => !x.approved);

  return publishFeedbackEvent(
    unapprovedFeedback.map(({ userId, sessionId }) => ({
      feedback: { type: 'approved', by },
      userId,
      sessionId
    })),
    tx
  );
}

export async function unapproveAttendeeFeedback(
  { userId, sessionId, by }: { userId: string; sessionId: string; by: string },
  tx: PgTransaction<any, any, any>
) {
  return publishFeedbackEvent([{ feedback: { type: 'unapproved', by }, userId, sessionId }], tx);
}
