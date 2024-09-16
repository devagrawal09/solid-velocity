import { A, createAsync, useAction, useParams } from '@solidjs/router';
import clsx from 'clsx';
import { format } from 'date-fns';
import { BsEmojiFrownFill, BsEmojiNeutralFill, BsEmojiSmileFill } from 'solid-icons/bs';
import {
  FaSolidArrowLeft,
  FaSolidArrowRight,
  FaSolidArrowUpShortWide,
  FaSolidClock,
  FaSolidMapPin,
  FaSolidTags
} from 'solid-icons/fa';
import { createMemo, For, Match, Show, Switch } from 'solid-js';

import { Button } from '~/components/ui/button';
import { showToast } from '~/components/ui/toast';
import { getSessionFeedback, rateSessionFn, reviewSessionFn } from '~/features/feedback/api';
import { Rating } from '~/features/feedback/store';
import { getSessionizeData } from '~/features/sessionize/api';
import { Category, Session } from '~/features/sessionize/store';
import {
  createEmitter,
  createEvent,
  createListener,
  createSubject,
  createTopic,
  Handler
} from '~/lib/events';
import { useClerk } from 'clerk-solidjs';

export default function SessionPage() {
  const data = createAsync(() => getSessionizeData());

  const params = useParams<{ sessionId: string }>();
  const session = () => data()?.sessions.find(s => s.id === params.sessionId);

  const room = () => data()?.rooms.find(r => r.id === session()?.roomId);

  const speaker = () =>
    data()?.speakers.filter(speaker => session()?.speakers.includes(speaker.id))[0];

  return (
    <Show when={session()}>
      {session => (
        <main class="px-5">
          <h1 class="text-xl font-semibold my-4">{session().title}</h1>

          {/* TODO: Only show this after the talk has ended */}
          <Feedback sessionId={session().id} />

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

type SessionFeedback = {
  rating?: Rating;
  review?: string;
};

function Feedback(props: { sessionId: string }) {
  const clerk = useClerk();
  const isSignedIn = createMemo(() => Boolean(clerk()?.user));
  const onServerFeedback = createEmitter(
    createAsync(() => getSessionFeedback(props.sessionId), { initialValue: {} })
  );

  const [onStateChange, emitStateChange] = createEvent<'rating' | 'review'>();
  const [onRated, emitRated] = createEvent<0 | 1 | 2>();
  const [onReview, emitReview] = createEvent<string>();

  const rateSessionAction = useAction(rateSessionFn);
  const reviewSessionAction = useAction(reviewSessionFn);

  const onServerRated = onRated(rating =>
    rateSessionAction({ sessionId: props.sessionId, rating })
  );
  const onServerReview = onReview(review =>
    reviewSessionAction({ sessionId: props.sessionId, review })
  );

  createToastListener(
    onServerRated(() => ({
      title: `Rating submitted!`,
      description: `Thanks for your feedback!`,
      variant: 'success',
      duration: 2000
    })),
    onServerReview(() => ({
      title: `Review submitted!`,
      description: `Thanks for your feedback!`,
      variant: 'success',
      duration: 2000
    }))
  );

  const state = createSubject(
    `rating`,
    onStateChange,
    onRated(() => (hasRated() ? null : `review`))
  );

  const sessionFeedback = createSubject<SessionFeedback>(
    {},
    onServerFeedback,
    onRated(rating => ({ rating })),
    onReview(review => ({ review }))
  );
  const hasRated = () => !(sessionFeedback()?.rating === undefined);

  return (
    <div class="bg-white rounded-sm text-sm bg-opacity-10 text-center my-2 py-2">
      <Show
        when={isSignedIn()}
        fallback={
          <A href="/sign-in" class=" hover:underline">
            Sign in to provide feedback
          </A>
        }
      >
        <Switch>
          <Match when={state() === 'rating'}>
            How was this talk?
            <div class="grid grid-cols-3">
              <button
                class="py-4 text-2xl flex justify-center bg-red-500 bg-opacity-50 rounded m-2 disabled:opacity-50 disabled:outline"
                disabled={sessionFeedback()?.rating === 0}
                onClick={() => emitRated(0)}
              >
                <BsEmojiFrownFill />
              </button>
              <button
                class="py-4 text-2xl flex justify-center bg-yellow-400 bg-opacity-50 rounded m-2 disabled:opacity-50 disabled:outline"
                disabled={sessionFeedback()?.rating === 1}
                onClick={() => emitRated(1)}
              >
                <BsEmojiNeutralFill />
              </button>
              <button
                class="py-4 text-2xl flex justify-center bg-green-500 bg-opacity-50 rounded m-2 disabled:opacity-50 disabled:outline"
                disabled={sessionFeedback()?.rating === 2}
                onClick={() => emitRated(2)}
              >
                <BsEmojiSmileFill />
              </button>
            </div>
            <Show when={hasRated()}>
              <Button
                class="text-xs flex items-center gap-1 m-auto"
                onClick={() => emitStateChange('review')}
              >
                Review <FaSolidArrowRight />
              </Button>
            </Show>
          </Match>
          <Match when={state() === 'review'}>
            <Show
              when={sessionFeedback()?.review}
              fallback={
                <>
                  Thanks for the rating! <br /> Would you like to write a review for this talk?
                </>
              }
            >
              <>
                Your review has been submitted! <br /> You can update your review here
              </>
            </Show>
            <form
              class="p-2 flex flex-col gap-2"
              onSubmit={async e => {
                e.preventDefault();
                const reviewEl = e.currentTarget.review as HTMLTextAreaElement;
                emitReview(reviewEl.value);
              }}
            >
              <textarea
                name="review"
                aria-label=""
                class="bg-gray-100 text-black w-full rounded p-2"
                value={sessionFeedback()?.review ?? ''}
              />
              <Button type="submit" class="bg-momentum rounded m-auto py-2 px-4">
                Submit
              </Button>
            </form>
            <Button
              class="text-xs flex items-center gap-1 m-auto"
              onClick={() => emitStateChange('rating')}
            >
              <FaSolidArrowLeft /> Rating
            </Button>
          </Match>
        </Switch>
      </Show>
    </div>
  );
}

type ToastProps = Parameters<typeof showToast>[0];

function createToastListener(...handlers: Handler<ToastProps>[]) {
  const handler = createTopic(...handlers);
  createListener(handler, showToast);
}
