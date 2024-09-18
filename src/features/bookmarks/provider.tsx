import { createContextProvider } from '@solid-primitives/context';
import { createWritableMemo } from '@solid-primitives/memo';
import { makePersisted } from '@solid-primitives/storage';
import { useAction, createAsync } from '@solidjs/router';
import { createMemo } from 'solid-js';
import { getUserBookmarks, bookmarkSessionFn, unbookmarkSessionFn } from './api';
import { useClerk } from 'clerk-solidjs';

export const [BookmarksProvider, useBookmarks] = createContextProvider(() => {
  const clerk = useClerk();
  const isSignedIn = createMemo(() => {
    return Boolean(clerk()?.user);
  });

  const unbookmarkSessionAction = useAction(unbookmarkSessionFn);
  const bookmarkSessionAction = useAction(bookmarkSessionFn);

  const serverBookmarks = createAsync(() => getUserBookmarks(), { initialValue: [] });

  const [bookmarkedSessions, setBookmarks] = makePersisted(createWritableMemo(serverBookmarks), {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    name: `bookmarks`
  });

  function toggleBookmark(sessionId: string) {
    const bookmarked = bookmarkedSessions().find(b => b === sessionId);
    console.log(bookmarked ? `removing` : `bookmarking`, sessionId, bookmarkedSessions());

    setBookmarks(bookmarks => {
      if (bookmarked) {
        return bookmarks.filter(b => b !== sessionId);
      }

      return [...bookmarks, sessionId];
    });

    if (isSignedIn())
      return bookmarked ? unbookmarkSessionAction(sessionId) : bookmarkSessionAction(sessionId);
  }

  function getBookmark(sessionId: string) {
    return !!bookmarkedSessions().find(s => s === sessionId);
  }

  return [getBookmark, toggleBookmark] as const;
});
