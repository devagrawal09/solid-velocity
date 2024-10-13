import { createContextProvider } from '@solid-primitives/context';
import { createWritableMemo } from '@solid-primitives/memo';
import { makePersisted } from '@solid-primitives/storage';
import { useAction, createAsync } from '@solidjs/router';
import { createMemo } from 'solid-js';
import { getUserBookmarks, bookmarkSessionFn, unbookmarkSessionFn } from './api';
import { useClerk } from 'clerk-solidjs';
import { showToast } from '~/components/ui/toast';
import { getSessionizeData } from '../sessionize/api';

export const [BookmarksProvider, useBookmarks] = createContextProvider(() => {
  const clerk = useClerk();
  const isSignedIn = createMemo(() => {
    return Boolean(clerk()?.user);
  });

  const unbookmarkSessionAction = useAction(unbookmarkSessionFn);
  const bookmarkSessionAction = useAction(bookmarkSessionFn);

  const serverBookmarks = createAsync(() => getUserBookmarks(), { initialValue: [] });
  const data = createAsync(() => getSessionizeData());

  const [bookmarkedSessions, setBookmarks] = makePersisted(createWritableMemo(serverBookmarks), {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    name: `bookmarks`
  });

  async function toggleBookmark(sessionId: string) {
    const bookmarked = bookmarkedSessions().find(b => b === sessionId);
    const session = data()?.sessions.find(s => s.id === sessionId);

    setBookmarks(bookmarks => {
      if (bookmarked) {
        return bookmarks.filter(b => b !== sessionId);
      }

      return [...bookmarks, sessionId];
    });

    if (isSignedIn())
      bookmarked
        ? await unbookmarkSessionAction(sessionId)
        : await bookmarkSessionAction(sessionId);

    session &&
      showToast({
        title: bookmarked ? 'Removed bookmark' : 'Bookmarked session',
        description: bookmarked ? (
          <>
            You have removed <strong>{toTruncated(session.title, 50)}</strong> from your bookmarks
          </>
        ) : (
          <>
            You have added <strong>{toTruncated(session.title, 50)}</strong> to your bookmarks
          </>
        ),
        variant: bookmarked ? 'warning' : 'default'
      });
  }

  function getBookmark(sessionId: string) {
    return !!bookmarkedSessions().find(s => s === sessionId);
  }

  return [getBookmark, toggleBookmark] as const;
});

function toTruncated(str: string, l: number) {
  if (str.length <= l) return str;

  return str.substring(0, l) + '...';
}
