import { createWritableMemo } from '@solid-primitives/memo';
import { makePersisted } from '@solid-primitives/storage';
import { A, action, cache, createAsync, reload, useAction } from '@solidjs/router';
import clsx from 'clsx';
import { differenceInMinutes, format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import {
  FaRegularBookmark,
  FaSolidBookmark,
  FaSolidChevronDown,
  FaSolidChevronRight
} from 'solid-icons/fa';
import { JSX, ParentProps, createMemo, createSignal } from 'solid-js';
import { getRequestAuth } from '~/auth';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { Skeleton } from '~/components/ui/skeleton';
import { storage } from '~/db';
import { Session, getCachedData } from '~/features/sessionize';

type TimeSlot = [string, string, Session[]];
type Bookmark = { sessionId: string; bookmarked: boolean };

export const sessionizeData = cache(async () => {
  'use server';

  const data = await getCachedData();
  return data;
}, 'sessionize');

export const getBookmarksFn = cache(async () => {
  'use server';
  const auth = getRequestAuth();

  if (auth?.userId) {
    const userBookmarks = await storage.getItem<Bookmark[]>(`bookmarks:${auth.userId}`);
    return userBookmarks || [];
  }

  return [];
}, 'bookmarks');

export function Schedule() {
  const data = createAsync(() => sessionizeData(), {
    initialValue: { sessions: [], speakers: [], rooms: [], categories: [] }
  });

  const timeSlots = createMemo(() => {
    return data().sessions.reduce<TimeSlot[]>((acc, session) => {
      const slot = acc.find(([start, end]) => start === session.startsAt && end === session.endsAt);

      if (slot) {
        slot[2].push(session);
      } else {
        acc.push([session.startsAt, session.endsAt, [session]]);
      }

      return acc;
    }, []);
  });

  const [getBookmark, toggle] = useBookmarks();

  return (
    <>
      {timeSlots().map(([start, end, sessions], i) => {
        const status = isStartingSoonOrStarted(start, end);
        return sessions.length > 1 ? (
          <TimeSlotComponent
            header={
              <>
                <h2>
                  {format(new Date(start), 'h:mm a')} to {format(new Date(end), 'h:mm a')}
                </h2>{' '}
                <span class="text-sm opacity-80">
                  {status === 'soon'
                    ? '(Starting soon)'
                    : status === 'started'
                      ? '(In progress)'
                      : status === 'ended'
                        ? '(Ended)'
                        : null}
                </span>
              </>
            }
            content={sessions.map(session => (
              <SessionWithBookmark
                session={session}
                class="border rounded-xl p-3 my-2 border-gray-700 flex flex-col gap-2"
              >
                <div class="flex gap-2">
                  <div class="grow flex flex-col gap-2">
                    <A href={`/session/${session.id}`}>
                      <h3 class="text-sm hover:underline">{session.title}</h3>
                    </A>
                    <p class="text-xs opacity-90">
                      {data().rooms.find(room => room.id === session.roomId)?.name}
                    </p>
                  </div>
                  <button
                    class="text-2xl"
                    onClick={() => toggle(session.id)}
                    title={getBookmark(session.id) ? 'Remove bookmark' : 'Add bookmark'}
                  >
                    {getBookmark(session.id) ? <FaSolidBookmark /> : <FaRegularBookmark />}
                  </button>
                </div>
                {session.speakers.map(speakerId => {
                  const speaker = createMemo(
                    () => data().speakers.find(speaker => speaker.id === speakerId)!
                  );

                  return (
                    <p class="text-xs flex items-center gap-2 px-1 py-1">
                      <img
                        src={speaker().profilePicture}
                        alt={speaker().fullName}
                        class="rounded-full"
                        width={24}
                        height={24}
                      />
                      {speaker().fullName}
                    </p>
                  );
                })}
                <div class="flex flex-wrap gap-2">
                  {data().categories.map(category =>
                    category.items
                      .filter(item => session.categoryItems.includes(item.id))
                      .map(item => (
                        <span
                          class={clsx(
                            'text-[11px] text-white px-1 py-1 rounded bg-opacity-70',
                            category.title === 'Level' && 'bg-[#145bff]',
                            category.title === 'Tags' && 'bg-[#03969b]'
                          )}
                        >
                          {item.name}
                        </span>
                      ))
                  )}
                </div>
              </SessionWithBookmark>
            ))}
            status={status}
            class={clsx(
              'py-2 px-4 w-full my-1 rounded-xl flex gap-2 items-center',
              !status && 'bg-momentum',
              status === 'soon' && 'bg-green-700',
              status === 'started' && 'bg-yellow-700',
              status === 'ended' && 'bg-gray-700'
            )}
          />
        ) : (
          <>
            <div class="px-3 py-3 border-gray-700 flex flex-col gap-1">
              <h2 class="text-sm">
                {format(new Date(start), 'h:mm a')} to {format(new Date(end), 'h:mm a')}
              </h2>
              <h3 class="text-sm">
                {sessions[0].title} -{' '}
                {data().rooms.find(room => room.id === sessions[0].roomId)?.name}
              </h3>
            </div>
          </>
        );
      })}
    </>
  );
}

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

function useBookmarks() {
  const [bookmarks, setBookmarks] = makePersisted(
    createWritableMemo(createAsync(() => getBookmarksFn(), { initialValue: [] })),
    { storage: typeof window !== 'undefined' ? window.localStorage : undefined, name: `bookmarks` }
  );

  const toggleBookmarkAction = useAction(toggleBookmarkFn);

  function toggleBookmark(sessionId: string) {
    setBookmarks(b => {
      const bookmarkIndex = b.findIndex(b => b.sessionId === sessionId);

      if (bookmarkIndex === -1) {
        return [...b, { sessionId, bookmarked: true }];
      }

      return b.map((b, i) => (i === bookmarkIndex ? { ...b, bookmarked: !b.bookmarked } : b));
    });

    return toggleBookmarkAction(sessionId);
  }

  function getBookmark(sessionId: string) {
    return bookmarks().find(b => b.sessionId === sessionId)?.bookmarked;
  }

  return [getBookmark, toggleBookmark] as const;
}

function isStartingSoonOrStarted(startsAt: string, endsAt: string) {
  const now = utcToZonedTime(
    // new Date(),
    new Date('Oct 19 2023 2023 13:30:00 GMT-0400'), // for testing
    // new Date('Oct 19 2023 2023 13:30:01 GMT-0400'), // for testing
    'America/New_York'
  );

  const startDiff = differenceInMinutes(new Date(startsAt), now, {
    roundingMethod: 'floor'
  });
  const endDiff = differenceInMinutes(new Date(endsAt), now, {
    roundingMethod: 'floor'
  });

  if (endDiff < 0) return 'ended';
  if (startDiff < 20 && startDiff >= 0) return 'soon';
  if (endDiff < 50) return 'started';
}

function SessionWithBookmark(props: ParentProps<{ session: Session; class: string }>) {
  const [getBookmark] = useBookmarks();

  return (
    <div
      class={clsx(props.class, getBookmark(props.session.id) ? 'bg-momentum' : 'border-gray-700')}
    >
      {props.children}
    </div>
  );
}

function TimeSlotComponent(props: {
  header: JSX.Element;
  content: JSX.Element;
  status?: 'soon' | 'started' | 'ended';
  class?: string;
}) {
  const [open, setOpen] = createSignal(false);

  return (
    <Collapsible open={open()} onOpenChange={setOpen}>
      <CollapsibleTrigger class={props.class}>
        {open() ? <FaSolidChevronDown /> : <FaSolidChevronRight />}
        {props.header}
      </CollapsibleTrigger>
      <CollapsibleContent>{props.content}</CollapsibleContent>
    </Collapsible>
  );
}

export function ScheduleSkeleton() {
  return (
    <div>
      <div class="px-3 py-3">
        <Skeleton height={19} width={200} class=" bg-gray-500 my-1" radius={5} />
        <Skeleton height={19} width={400} class=" bg-gray-500 my-1" radius={5} />
      </div>
      <div class="px-3 py-3">
        <Skeleton height={19} width={200} class=" bg-gray-500 my-1" radius={5} />
        <Skeleton height={19} width={400} class=" bg-gray-500 my-1" radius={5} />
      </div>
      <Skeleton height={40} class="bg-momentum my-1" radius={10} />
    </div>
  );
}
