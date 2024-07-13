import { storage } from '~/db';

export type BookmarkEvent =
  | { type: 'bookmarked'; userId: string; sessionId: string }
  | { type: 'unbookmarked'; userId: string; sessionId: string };

async function getBookmarkEvents() {
  return (await storage.getItem<BookmarkEvent[]>('bookmarks/events')) || [];
}

async function publishBookmarkEvent(events: BookmarkEvent[]) {
  const existingEvents = await getBookmarkEvents();
  storage.setItem('bookmarks/events', [...existingEvents, ...events]);
  return events;
}

export async function bookmarkSession({
  userId,
  sessionId
}: {
  userId: string;
  sessionId: string;
}) {
  const bookmarks = await getBookmarkedSessions(userId);
  if (bookmarks.includes(sessionId)) {
    return new Error('Session already bookmarked');
  }

  return publishBookmarkEvent([{ type: 'bookmarked', userId, sessionId }]);
}

export async function unbookmarkSession({
  userId,
  sessionId
}: {
  userId: string;
  sessionId: string;
}) {
  const bookmarks = await getBookmarkedSessions(userId);
  if (!bookmarks.includes(sessionId)) {
    return new Error('Session not bookmarked');
  }

  return publishBookmarkEvent([{ type: 'unbookmarked', userId, sessionId }]);
}

export async function getBookmarkedSessions(userId: string) {
  const events = await getBookmarkEvents();

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
