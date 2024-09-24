import { createAsync, useAction } from '@solidjs/router';
import { BsEmojiFrownFill, BsEmojiNeutralFill, BsEmojiSmileFill } from 'solid-icons/bs';
import { FaSolidArrowLeft, FaSolidArrowRight } from 'solid-icons/fa';
import { Match, Show, Switch } from 'solid-js';
import { Button } from '~/components/ui/button';
import { createEmitter, createEvent, createSubject } from '~/lib/events';
import { createToastListener } from '~/lib/toast';
import { getSessionFeedback, rateSessionFn, reviewSessionFn } from './api';
import { Rating } from './store';

type SessionFeedback = {
  rating?: Rating;
  review?: string;
};

export function AttendeeFeedbackForm(props: { sessionId: string }) {
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
    </div>
  );
}
