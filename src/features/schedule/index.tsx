import { A, createAsync } from '@solidjs/router';
import clsx from 'clsx';
import { differenceInMinutes, format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import {
  FaRegularBookmark,
  FaSolidBookmark,
  FaSolidChevronDown,
  FaSolidChevronRight
} from 'solid-icons/fa';
import { For, Show, createEffect, createMemo, createSignal } from 'solid-js';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { Skeleton } from '~/components/ui/skeleton';
import { getSessionizeData } from '../sessionize/api';
import type { Category, Session } from '../sessionize/store';
import { BookmarksProvider, useBookmarks } from './bookmarks';

type TimeSlot = [string, string, Session[]];

export function Schedule() {
  const data = createAsync(() => getSessionizeData(), {
    initialValue: { sessions: [], speakers: [], rooms: [], categories: [] }
  });

  const untimedSessions = createMemo(() => data()?.sessions.filter(s => !s.startsAt));

  const timeSlots = createMemo(() => {
    return data()?.sessions.reduce<TimeSlot[]>((acc, session) => {
      if (!session.startsAt || !session.endsAt) {
        return acc;
      }
      const slot = acc.find(([start, end]) => start === session.startsAt && end === session.endsAt);

      if (slot) {
        slot[2].push(session);
      } else {
        acc.push([session.startsAt, session.endsAt, [session]]);
      }

      return acc;
    }, []);
  });

  return (
    <BookmarksProvider>
      <Show
        when={timeSlots()?.length}
        fallback={
          <>
            <h1 class="text-4xl font-semibold my-4">Accepted Sessions</h1>
            <For each={untimedSessions()}>{session => <SessionComponent session={session} />}</For>
          </>
        }
      >
        <h1 class="text-4xl font-semibold my-4">Schedule</h1>
        <For each={timeSlots()}>{timeSlot => <TimeSlotComponent slot={timeSlot} />}</For>
      </Show>
    </BookmarksProvider>
  );
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

function TimeSlotComponent(props: { slot: TimeSlot }) {
  const data = createAsync(() => getSessionizeData());

  const start = () => props.slot[0];
  const end = () => props.slot[1];
  const sessions = () => props.slot[2];
  const status = () => isStartingSoonOrStarted(start(), end());

  const [open, setOpen] = createSignal(false);

  return (
    <Show
      when={sessions().length > 1}
      fallback={
        <div class="px-3 py-3 border-gray-700 flex flex-col gap-1">
          <h2 class="text-sm">
            {format(new Date(start()), 'h:mm a')} to {format(new Date(end()), 'h:mm a')}
          </h2>
          <h3 class="text-sm">
            {sessions()[0].title} -{' '}
            {data()?.rooms.find(room => room.id === sessions()[0].roomId)?.name}
          </h3>
        </div>
      }
    >
      <Collapsible open={open()} onOpenChange={setOpen}>
        <CollapsibleTrigger
          class={clsx(
            'py-2 px-4 w-full my-1 rounded-xl flex gap-2 items-center',
            !status() && 'bg-momentum',
            status() === 'soon' && 'bg-green-700',
            status() === 'started' && 'bg-yellow-700',
            status() === 'ended' && 'bg-gray-700'
          )}
        >
          {open() ? <FaSolidChevronDown /> : <FaSolidChevronRight />}
          <h2>
            {format(new Date(start()), 'h:mm a')} to {format(new Date(end()), 'h:mm a')}
          </h2>
          <span class="text-sm opacity-80">
            {status() === 'soon'
              ? '(Starting soon)'
              : status() === 'started'
                ? '(In progress)'
                : status() === 'ended'
                  ? '(Ended)'
                  : null}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <For each={sessions()}>{session => <SessionComponent session={session} />}</For>
        </CollapsibleContent>
      </Collapsible>
    </Show>
  );
}

function SessionComponent(props: { session: Session }) {
  const data = createAsync(() => getSessionizeData());
  const [getBookmark, toggle] = useBookmarks()!;

  return (
    <div
      class={clsx(
        'border rounded-xl p-3 my-2 border-gray-700 flex flex-col gap-2',
        getBookmark(props.session.id) ? 'bg-momentum' : 'border-gray-700'
      )}
    >
      <div class="flex gap-2">
        <div class="grow flex flex-col gap-2">
          <A href={`/session/${props.session.id}`}>
            <h3 class="text-sm hover:underline">{props.session.title}</h3>
          </A>
          <p class="text-xs opacity-90">
            {data()?.rooms.find(room => room.id === props.session.roomId)?.name}
          </p>
        </div>
        <button
          class="text-2xl"
          onClick={() => toggle(props.session.id)}
          title={getBookmark(props.session.id) ? 'Remove bookmark' : 'Add bookmark'}
        >
          {getBookmark(props.session.id) ? <FaSolidBookmark /> : <FaRegularBookmark />}
        </button>
      </div>
      <For each={props.session.speakers}>
        {speakerId => {
          const speaker = createMemo(() =>
            data()?.speakers.find(speaker => speaker.id === speakerId)
          );

          return (
            <p class="text-xs flex items-center gap-2 px-1 py-1">
              <img
                src={speaker()?.profilePicture}
                alt={speaker()?.fullName}
                class="rounded-full"
                width={24}
                height={24}
              />
              {speaker()?.fullName}
            </p>
          );
        }}
      </For>
      <div class="flex flex-wrap gap-2">
        <For each={data()?.categories}>
          {category => (
            <For each={categoriesForSession(category, props.session)}>
              {item => (
                <span
                  class={clsx(
                    'text-[11px] text-white px-1 py-1 rounded bg-opacity-70',
                    category.title === 'Level' && 'bg-[#145bff]',
                    category.title === 'Tags' && 'bg-[#03969b]'
                  )}
                >
                  {item.name}
                </span>
              )}
            </For>
          )}
        </For>
      </div>
    </div>
  );
}

function categoriesForSession(
  category: Category,
  session: Session
): { sort: number; id: number; name: string }[] {
  return category.items.filter(item => session.categoryItems.includes(item.id));
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
