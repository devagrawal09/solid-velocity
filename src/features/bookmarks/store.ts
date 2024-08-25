import { eq } from 'drizzle-orm';
import { pgEnum, pgTable, PgTransaction, text, uuid } from 'drizzle-orm/pg-core';

export const bookmarkEventTypes = pgEnum(`bookmark-event-types`, ['bookmarked', 'unbookmarked']);

export const bookmarkEvents = pgTable(`bookmark-events`, {
  id: uuid(`id`).defaultRandom().primaryKey(),
  type: bookmarkEventTypes(`type`).notNull(),
  userId: text(`userId`).notNull(),
  sessionId: text(`sessionId`).notNull()
});

export type BookmarkEvent = typeof bookmarkEvents.$inferInsert;

async function getBookmarkEvents(userId: string, tx: PgTransaction<any, any, any>) {
  return tx.select().from(bookmarkEvents).where(eq(bookmarkEvents.userId, userId));
}

async function publishBookmarkEvent(events: BookmarkEvent[], tx: PgTransaction<any, any, any>) {
  await tx.insert(bookmarkEvents).values(events);
  return events;
}

export async function bookmarkSession(
  {
    userId,
    sessionId
  }: {
    userId: string;
    sessionId: string;
  },
  tx: PgTransaction<any, any, any>
) {
  const bookmarks = await getBookmarkedSessions(userId, tx);
  if (bookmarks.includes(sessionId)) {
    return new Error('Session already bookmarked');
  }

  return publishBookmarkEvent([{ type: 'bookmarked', userId, sessionId }], tx);
}

export async function unbookmarkSession(
  {
    userId,
    sessionId
  }: {
    userId: string;
    sessionId: string;
  },
  tx: PgTransaction<any, any, any>
) {
  const bookmarks = await getBookmarkedSessions(userId, tx);
  if (!bookmarks.includes(sessionId)) {
    return new Error('Session not bookmarked');
  }

  return publishBookmarkEvent([{ type: 'unbookmarked', userId, sessionId }], tx);
}

export async function getBookmarkedSessions(userId: string, tx: PgTransaction<any, any, any>) {
  const events = await getBookmarkEvents(userId, tx);

  return events.reduce((acc, event) => {
    if (event.type === 'bookmarked' && event.userId === userId) {
      return [...acc, event.sessionId];
    }

    if (event.type === 'unbookmarked' && event.userId === userId) {
      return acc.filter(s => s !== event.sessionId);
    }

    return acc;
  }, [] as string[]);
}
