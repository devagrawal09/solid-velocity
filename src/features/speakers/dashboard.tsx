import { Collapsible } from '@kobalte/core/collapsible';
import { createWritableMemo } from '@solid-primitives/memo';
import { makePersisted } from '@solid-primitives/storage';
import { A, cache, createAsync, useAction } from '@solidjs/router';
import clsx from 'clsx';
import { differenceInMinutes, format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { FaSolidChevronDown, FaSolidChevronRight } from 'solid-icons/fa';
import { For, JSX, ParentProps, Show, createEffect, createMemo, createSignal } from 'solid-js';
import { Button } from '~/components/ui/button';
import { CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { showToast } from '~/components/ui/toast';
import { Category, Session, getCachedData } from '~/features/sessionize';
import {
  getRequestSpeakerFn,
  getSignedUpSpeakersFn,
  getSpeakerAssignmentsFn,
  signUpSpeakerFn,
  toggleAssignmentFn
} from './s2s-store';
import { Skeleton } from '~/components/ui/skeleton';
import { createContextProvider } from '@solid-primitives/context';

type TimeSlot = [string, string, Session[]];

export const sessionizeData = cache(async () => {
  'use server';

  const data = await getCachedData();
  return data;
}, 'sessionize');

export function SpeakerDashboard() {
  const speakerId = createAsync(() => getRequestSpeakerFn(), { initialValue: '' });
  const signedUpSpeakers = createAsync(() => getSignedUpSpeakersFn(), { initialValue: [] });
  const isSpeakerSignedUp = () => signedUpSpeakers().includes(speakerId());

  const data = createAsync(() => sessionizeData(), {
    initialValue: { sessions: [], speakers: [], rooms: [], categories: [] }
  });

  const timeSlots = () =>
    data().sessions.reduce<TimeSlot[]>((acc, session) => {
      const slot = acc.find(([start, end]) => start === session.startsAt && end === session.endsAt);

      if (slot) {
        slot[2].push(session);
      } else {
        acc.push([session.startsAt, session.endsAt, [session]]);
      }

      return acc;
    }, []);

  const mySession = () => data().sessions.find(session => session.speakers.includes(speakerId()));

  createEffect(() => console.log(signedUpSpeakers()));

  return (
    <>
      <Show when={mySession()}>
        {session => (
          <>
            <p class="text-lg my-4">Your Session</p>
            <MySessionComponent session={session()} />
          </>
        )}
      </Show>
      <Show when={isSpeakerSignedUp()} fallback={<S2SNotSignedUp />}>
        <p class="text-lg my-4">Sessions available for S2S</p>
        <For each={timeSlots()}>
          {([start, end, sessions]) => {
            const status = isStartingSoonOrStarted(start, end);

            const signedUpSessions = () =>
              sessions
                // filter out my session
                .filter(session => !session.speakers.includes(speakerId()))
                // filter in sessions by signed up speakers
                .filter(s => signedUpSpeakers().find(speaker => s.speakers.includes(speaker)));

            return (
              <Show when={signedUpSessions().length > 0}>
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
                  content={
                    <For each={signedUpSessions()}>
                      {session => (
                        <AssignmentProvider sessionId={session.id}>
                          <SessionComponent session={session} />
                        </AssignmentProvider>
                      )}
                    </For>
                  }
                  status={status}
                  class={clsx(
                    'py-2 px-4 w-full my-1 rounded-xl flex gap-2 items-center',
                    !status && 'bg-momentum',
                    status === 'soon' && 'bg-green-700',
                    status === 'started' && 'bg-yellow-700',
                    status === 'ended' && 'bg-gray-700'
                  )}
                />
              </Show>
            );
          }}
        </For>
      </Show>
    </>
  );
}

function SessionComponent(props: ParentProps<{ session: Session }>) {
  const data = createAsync(() => sessionizeData(), {
    initialValue: { sessions: [], speakers: [], rooms: [], categories: [] }
  });

  const { isAssigned } = useAssignment();

  return (
    <div
      class={clsx(
        'border rounded-xl p-3 my-2 border-gray-700',
        isAssigned() ? 'bg-momentum' : 'border-gray-700'
      )}
    >
      <div class="flex">
        <div class="grow flex flex-col gap-2">
          <div class="flex gap-2">
            <div class="grow flex flex-col gap-2">
              <A href={`/session/${props.session.id}`}>
                <h3 class="text-sm hover:underline">{props.session.title}</h3>
              </A>
              <p class="text-xs opacity-90">
                {data().rooms.find(room => room.id === props.session.roomId)?.name}
              </p>
            </div>
          </div>
          <For each={props.session.speakers}>
            {speakerId => {
              const speaker = createMemo(() =>
                data().speakers.find(speaker => speaker.id === speakerId)
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
            <For each={data().categories}>
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
        <AssignmentComponent session={props.session} />
      </div>
    </div>
  );
}

function MySessionComponent(props: ParentProps<{ session: Session }>) {
  const data = createAsync(() => sessionizeData(), {
    initialValue: { sessions: [], speakers: [], rooms: [], categories: [] }
  });

  return (
    <div class={clsx('border rounded-xl p-3 my-2 border-gray-700')}>
      <div class="flex">
        <div class="grow flex flex-col gap-2">
          <div class="flex gap-2">
            <div class="grow flex flex-col gap-2">
              <A href={`/session/${props.session.id}`}>
                <h3 class="text-sm hover:underline">{props.session.title}</h3>
              </A>
              <p class="text-xs opacity-90">
                {data().rooms.find(room => room.id === props.session.roomId)?.name}
              </p>
            </div>
          </div>
          <For each={props.session.speakers}>
            {speakerId => {
              const speaker = createMemo(() =>
                data().speakers.find(speaker => speaker.id === speakerId)
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
            <For each={data().categories}>
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
        {/* <AssignmentComponent session={props.session} /> */}
      </div>
    </div>
  );
}

function S2SNotSignedUp() {
  const signUpSpeakerAction = useAction(signUpSpeakerFn);
  return (
    <>
      <p class="text-lg my-4">Speaker-to-speaker Feedback Program</p>
      <p class="my-4">Placeholder info</p>
      <form
        onSubmit={e => {
          e.preventDefault();
          signUpSpeakerAction();
        }}
      >
        <button
          type="submit"
          class="text-white bg-momentum rounded-xl px-4 py-2 hover:bg-opacity-70"
        >
          I wanna participate!
        </button>
      </form>
    </>
  );
}

function categoriesForSession(
  category: Category,
  session: Session
): { sort: number; id: number; name: string }[] {
  return category.items.filter(item => session.categoryItems.includes(item.id));
}

function isStartingSoonOrStarted(startsAt: string, endsAt: string) {
  const now = utcToZonedTime(
    new Date(),
    // new Date("Oct 19 2023 2023 12:30:13 GMT-0400"), // for testing
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

function TimeSlotComponent(props: {
  header: JSX.Element;
  content: JSX.Element;
  status?: 'soon' | 'started' | 'ended';
  class?: string;
}) {
  const [open, setOpen] = createSignal(true);

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

function AssignmentComponent({ session }: { session: Session }) {
  const { isAssigned, toggleAction } = useAssignment();

  const toggleAssignment = async function () {
    try {
      await toggleAction(session.id);

      if (isAssigned()) {
        showToast({
          title: `${session.title.substring(0, 30)}... added to Assignments`,
          variant: 'success',
          duration: 2000
        });
      } else {
        showToast({
          title: `${session.title.substring(0, 30)}... removed from Assignments`,
          variant: 'destructive',
          duration: 2000
        });
      }
    } catch (e) {
      console.error(e);
      showToast({
        title: `Error saving Assignments, please try again`,
        variant: 'error'
      });
    }
  };

  const Assigned = () => (
    <form
      class="flex flex-col justify-between items-end"
      onSubmit={e => {
        e.preventDefault();
        toggleAssignment();
      }}
    >
      <Button type="submit" class="text-sm font-bold" variant="destructive">
        Remove Assignment
      </Button>
      <A class="text-sm font-bold" href={`/s2s/${session.id}`}>
        <Button class="text-sm font-bold" variant="secondary">
          Submit Feedback
        </Button>
      </A>
    </form>
  );

  const Unassigned = () => (
    <form
      class="flex flex-col"
      onSubmit={e => {
        e.preventDefault();
        toggleAssignment();
      }}
    >
      <Button type="submit" variant="success" class="text-sm font-bold">
        Assign to me
      </Button>
    </form>
  );

  return (
    <Show when={isAssigned()} fallback={<Unassigned />}>
      <Assigned />
    </Show>
  );
}

const [AssignmentProvider, useAssignment] = createContextProvider(
  (props: { sessionId: string }) => {
    const [assignments, setAssignments] = makePersisted(
      createWritableMemo(createAsync(() => getSpeakerAssignmentsFn(), { initialValue: [] })),
      {
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        name: `assignments`
      }
    );

    const toggleAssignmentAction = useAction(toggleAssignmentFn);

    function toggleAction(sessionId: string) {
      setAssignments(b =>
        b.includes(sessionId) ? b.filter(id => id !== sessionId) : [...b, sessionId]
      );

      return toggleAssignmentAction(sessionId);
    }

    return { isAssigned: () => assignments().includes(props.sessionId), toggleAction };
  },
  {
    isAssigned: () => {
      throw new Error(`useAssignment was used outside <AssignmentProvider>`);
    },
    toggleAction: async args => {
      throw new Error(`useAssignment was used outside <AssignmentProvider>`);
    }
  }
);

export function ScheduleSkeleton() {
  return (
    <div>
      <div class="pb-3 pt-1">
        <Skeleton height={20} width={400} class=" bg-gray-500 my-1" radius={5} />
      </div>
      <Skeleton height={40} class="bg-momentum my-1" radius={10} />
    </div>
  );
}
