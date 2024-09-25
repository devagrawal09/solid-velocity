import { A, createAsync, RouteDefinition, useParams } from '@solidjs/router';
import { SignInButton, useClerk } from 'clerk-solidjs';
import clsx from 'clsx';
import { format } from 'date-fns';
import { FaSolidArrowUpShortWide, FaSolidClock, FaSolidMapPin, FaSolidTags } from 'solid-icons/fa';
import { createMemo, For, Show, Suspense } from 'solid-js';
import { AttendeeFeedbackForm } from '~/features/feedback';
import { getSessionizeData } from '~/features/sessionize/api';
import { Category, Session } from '~/features/sessionize/store';
import { createShowFeedback, SpeakerFeedbackForm } from '~/features/speakers/form';
import { SpeakerImpersonator } from '~/features/speakers/impersonator';

export const route = {
  preload() {
    getSessionizeData();
  }
} satisfies RouteDefinition;

export default function SessionPage() {
  const data = createAsync(() => getSessionizeData());

  const params = useParams<{ sessionId: string }>();
  const session = () => data()?.sessions.find(s => s.id === params.sessionId);

  const room = () => data()?.rooms.find(r => r.id === session()?.roomId);

  const speaker = () =>
    data()?.speakers.filter(speaker => session()?.speakers.includes(speaker.id))[0];

  const clerk = useClerk();
  const isSignedIn = () => Boolean(clerk()?.user);

  return (
    <Show when={session()}>
      {session => (
        <main class="px-2 sm:px-5">
          <div class="flex justify-between">
            <h1 class="text-xl font-semibold my-4">{session().title}</h1>
            <SpeakerImpersonator />
          </div>

          <Suspense
            fallback={<div class="h-9 animate-pulse bg-white bg-opacity-10 rounded-sm my-2" />}
          >
            <Show
              when={isSignedIn()}
              fallback={
                <div class="bg-white rounded-sm text-sm bg-opacity-10 text-center my-2 py-2">
                  <SignInButton class="hover:underline">Sign in to provide feedback</SignInButton>
                </div>
              }
            >
              {_ => {
                const { showS2sForm, isCurrentSpeaker } = createShowFeedback(
                  () => speaker()?.id || ``
                );

                const hasTalkStarted = createMemo(() => {
                  const endsAt = new Date(session()?.startsAt || ``);
                  return new Date() > endsAt;
                });

                return (
                  <Show when={!isCurrentSpeaker()}>
                    <Show
                      when={hasTalkStarted()}
                      fallback={
                        <div class="bg-white rounded-sm text-sm bg-opacity-10 text-center my-2 py-2">
                          The feedback form will be available here after the session starts.
                        </div>
                      }
                    >
                      <Show
                        when={showS2sForm()}
                        fallback={<AttendeeFeedbackForm sessionId={session().id} />}
                      >
                        <SpeakerFeedbackForm sessionId={session().id} />
                      </Show>
                    </Show>
                  </Show>
                );
              }}
            </Show>
          </Suspense>
          <div class="flex items-center gap-2">
            <FaSolidMapPin />
            <span class="">{room()?.name}</span>
          </div>

          <div class="flex items-center gap-2">
            <FaSolidClock />
            <span class="text-sm">
              <Show when={session().startsAt} fallback="Not decided yet">
                {startsAt => format(new Date(startsAt()), 'h:mm a')}
              </Show>
            </span>
          </div>
          <For each={data()?.categories}>
            {category => (
              <div class="flex items-center gap-2">
                <Show when={category.title === `Level`} fallback={<FaSolidTags />}>
                  <FaSolidArrowUpShortWide />
                </Show>
                <div>
                  <For each={categoriesForSession(category, session())}>
                    {item => (
                      <span
                        class={clsx(
                          `text-sm px-2 mr-1 rounded bg-opacity-70 text-white`,
                          category.title === 'Level' && 'bg-[#145bff]',
                          category.title === 'Tags' && 'bg-[#03969b]'
                        )}
                      >
                        {item.name}
                      </span>
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>

          <p class="text-sm my-4">{session().description}</p>

          <Show when={speaker()}>
            {speaker => (
              <div class="flex items-center gap-2 px-1 py-1">
                <img
                  src={speaker().profilePicture}
                  alt={speaker().tagLine}
                  class="rounded-full"
                  width={64}
                  height={64}
                />
                <div>
                  <p class="">{speaker().fullName}</p>
                  <p class="text-xs">{speaker().tagLine}</p>
                </div>
              </div>
            )}
          </Show>
        </main>
      )}
    </Show>
  );
}

function categoriesForSession(
  category: Category,
  session: Session
): { sort: number; id: number; name: string }[] {
  return category.items.filter(item => session.categoryItems.includes(item.id));
}
