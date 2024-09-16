import { createContextProvider } from '@solid-primitives/context';
import { createWritableMemo } from '@solid-primitives/memo';
import { makePersisted } from '@solid-primitives/storage';
import { action, cache, createAsync, reload, useAction } from '@solidjs/router';
import { useClerk } from 'clerk-solidjs';
import { createMemo } from 'solid-js';
import { getRequestAuth } from '~/auth';
import { storage } from '~/db/kv';

export type Bookmark = { sessionId: string; bookmarked: boolean };

export const getBookmarksFn = cache(async () => {
  'use server';
  const auth = getRequestAuth();

  if (auth?.userId) {
    const userBookmarks = await storage.getItem<Bookmark[]>(`bookmarks:${auth.userId}`);
    return userBookmarks || [];
  }

  return [];
}, 'bookmarks');

const toggleBookmarkFn = action(async (sessionId: string) => {
  'use server';
  const auth = getRequestAuth();

  if (auth?.userId) {
    const bookmarks = await getBookmarksFn();

    if (!bookmarks) {
      await storage.setItem<Bookmark[]>(`bookmarks:${auth.userId}`, [
        { sessionId, bookmarked: true }
      ]);

      return true;
    }

    const bookmarkIndex = bookmarks.findIndex(b => b.sessionId === sessionId);

    if (bookmarkIndex === -1) {
      bookmarks.push({ sessionId, bookmarked: true });
    } else {
      bookmarks[bookmarkIndex].bookmarked = !bookmarks[bookmarkIndex].bookmarked;
    }

    await storage.setItem(`bookmarks:${auth.userId}`, bookmarks);

    throw reload({ revalidate: getBookmarksFn.key });
  }
});

export const [BookmarksProvider, useBookmarks] = createContextProvider(() => {
  const clerk = useClerk();
  const isSignedIn = createMemo(() => {
    return Boolean(clerk()?.user);
  });

  const toggleBookmarkAction = useAction(toggleBookmarkFn);

  const [bookmarks, setBookmarks] = makePersisted(
    createWritableMemo(createAsync(() => getBookmarksFn(), { initialValue: [] })),
    { storage: typeof window !== 'undefined' ? window.localStorage : undefined, name: `bookmarks` }
  );

  function toggleBookmark(sessionId: string) {
    setBookmarks(b => {
      const bookmarkIndex = b.findIndex(b => b.sessionId === sessionId);

      if (bookmarkIndex === -1) {
        return [...b, { sessionId, bookmarked: true }];
      }

      return b.map((b, i) => (i === bookmarkIndex ? { ...b, bookmarked: !b.bookmarked } : b));
    });

    if (isSignedIn()) return toggleBookmarkAction(sessionId);
  }

  function getBookmark(sessionId: string) {
    return bookmarks().find(b => b.sessionId === sessionId)?.bookmarked;
  }

  return [getBookmark, toggleBookmark] as const;
});
