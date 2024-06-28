import { Collapsible } from '@kobalte/core/collapsible';
import { A, cache, useAction, createAsyncStore, createAsync } from '@solidjs/router';
import clsx from 'clsx';
import { differenceInMinutes, format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { FaSolidChevronDown, FaSolidChevronRight } from 'solid-icons/fa';
import { For, ParentProps, Show, createMemo, createSignal } from 'solid-js';
import { CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { Skeleton } from '~/components/ui/skeleton';
import { Category, Session, getCachedData } from '~/features/sessionize';
import {
  getRequestSpeakerFn,
  getSignedUpSpeakersFn,
  removeSpeakerFn,
  signUpSpeakerFn
} from './api';
import { AssignmentComponent, AssignmentProvider, useAssignment } from './assignment';
import { Button } from '~/components/ui/button';
import { MySessionComponent } from './my-session';
import { createEvent, createListener } from '~/lib/events';
import { showToast } from '~/components/ui/toast';

type TimeSlot = [string, string, Session[]];

export const sessionizeData = cache(async () => {
  'use server';

  const data = await getCachedData();
  return data;
}, 'sessionize');

export function SpeakerDashboard() {
  const speakerId = createAsync(() => getRequestSpeakerFn(), { initialValue: '' });
  const signedUpSpeakers = createAsync(() => getSignedUpSpeakersFn());
  const data = createAsync(() => sessionizeData());

  const isSpeakerSignedUp = () => signedUpSpeakers()?.includes(speakerId());

  const timeSlots = () =>
    data()?.sessions.reduce<TimeSlot[]>((acc, session) => {
      const slot = acc.find(([start, end]) => start === session.startsAt && end === session.endsAt);

      if (slot) {
        slot[2].push(session);
      } else {
        acc.push([session.startsAt, session.endsAt, [session]]);
      }

      return acc;
    }, []);

  const mySession = () => data()?.sessions.find(session => session.speakers.includes(speakerId()));

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
      <Show when={isSpeakerSignedUp()} fallback={<OptIn />}>
        <Show when={(signedUpSpeakers()?.length || 1) > 1} fallback={<NoSpeakers />}>
          <div class="flex items-center">
            <p class="text-lg my-4 grow">Sessions available for S2S</p>
            <OptOut />
          </div>
          <For each={timeSlots()}>
            {([start, end, sessions]) => {
              const status = isStartingSoonOrStarted(start, end);

              const signedUpSessions = () =>
                sessions
                  // filter out my session
                  .filter(session => !session.speakers.includes(speakerId()))
                  // filter in sessions by signed up speakers
                  .filter(s => signedUpSpeakers()?.find(speaker => s.speakers.includes(speaker)));

              const [open, setOpen] = createSignal(true);

              return (
                <Show when={signedUpSessions().length > 0}>
                  <Collapsible open={open()} onOpenChange={setOpen}>
                    <CollapsibleTrigger
                      class={clsx(
                        'py-2 px-4 w-full my-1 rounded-xl flex gap-2 items-center',
                        !status && 'bg-momentum',
                        status === 'soon' && 'bg-green-700',
                        status === 'started' && 'bg-yellow-700',
                        status === 'ended' && 'bg-gray-700'
                      )}
                    >
                      {open() ? <FaSolidChevronDown /> : <FaSolidChevronRight />}
                      <h2>
                        {format(new Date(start), 'h:mm a')} to {format(new Date(end), 'h:mm a')}
                      </h2>
                      <span class="text-sm opacity-80">
                        {status === 'soon'
                          ? '(Starting soon)'
                          : status === 'started'
                            ? '(In progress)'
                            : status === 'ended'
                              ? '(Ended)'
                              : null}
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <For each={signedUpSessions()}>
                        {session => (
                          <AssignmentProvider session={session}>
                            <SessionComponent session={session} />
                          </AssignmentProvider>
                        )}
                      </For>
                    </CollapsibleContent>
                  </Collapsible>
                </Show>
              );
            }}
          </For>
        </Show>
      </Show>
    </>
  );
}

function OptOut() {
  const [onOptOut, emitOptOut] = createEvent();
  const removeSpeakerAction = useAction(removeSpeakerFn);
  const onOptOutResult = onOptOut(removeSpeakerAction);

  createListener(onOptOutResult, async result => {
    const res = await result;

    if (res instanceof Error) {
      return showToast({
        title: res.message,
        variant: 'error',
        duration: 2000
      });
    }

    if (res.find(e => e.type === 'speaker-removed')) {
      showToast({
        title: (
          <>
            You have <strong>opted out</strong> of S2S.
          </>
        ),
        variant: 'warning',
        duration: 2000
      });
    }
  });

  return (
    <Button class="text-xs font-bold" size="xs" variant="destructive" onClick={emitOptOut}>
      Opt-out of S2S
    </Button>
  );
}

function OptIn() {
  const [onOptIn, emitOptIn] = createEvent();
  const signUpSpeakerAction = useAction(signUpSpeakerFn);
  const onOptInResult = onOptIn(signUpSpeakerAction);

  createListener(onOptInResult, async result => {
    const res = await result;

    if (res instanceof Error) {
      return showToast({
        title: res.message,
        variant: 'error',
        duration: 2000
      });
    }

    if (res.find(e => e.type === 'speaker-signedup')) {
      showToast({
        title: (
          <>
            You have <strong>opted in</strong> to S2S.
          </>
        ),
        variant: 'success',
        duration: 2000
      });
    }
  });

  return (
    <>
      <p class="text-lg my-4">Speaker-to-speaker Feedback Program</p>
      <p class="my-4">Placeholder info</p>

      <button
        type="submit"
        class="text-white bg-momentum rounded-xl px-4 py-2 hover:bg-opacity-70"
        onClick={emitOptIn}
      >
        I wanna participate!
      </button>
    </>
  );
}

function NoSpeakers() {
  return (
    <p class="my-4">
      Looks like no one else has signed up for the speaker-to-speaker feedback program yet.
      <br />
      Check back later, or encourage your speaker friends to participate!
    </p>
  );
}

function SessionComponent(props: ParentProps<{ session: Session }>) {
  const data = createAsyncStore(() => sessionizeData(), {
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