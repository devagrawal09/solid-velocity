import { createAsync } from '@solidjs/router';
import clsx from 'clsx';
import { For, Match, Show, Switch } from 'solid-js';
import { getSpeakerSessionFeedback } from './api';
import { BsEmojiFrownFill, BsEmojiNeutralFill, BsEmojiSmileFill } from 'solid-icons/bs';

export function ViewAttendeeFeedback() {
  const feedbackSubmissions = createAsync(() => getSpeakerSessionFeedback());

  return (
    <div class={clsx('rounded-sm text-center text-sm my-2 py-2 bg-white bg-opacity-10')}>
      <h2 class="text-xl font-semibold mb-2">Attendee Feedback</h2>
      <Show
        when={feedbackSubmissions()?.length}
        fallback={
          <>
            Attendee feedback has not yet been made visible! If you think this is a mistake please
            reach out to the Momentum organizers.
          </>
        }
      >
        <div class="text-left px-4">
          <ul class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            <For each={feedbackSubmissions()}>
              {submission => (
                <li class={clsx('border-b border-gray-500 p-2 bg-white bg-opacity-10 text-center')}>
                  <div class="text-center">
                    <Switch>
                      <Match when={submission.rating === 0}>
                        <span class="py-4 text-2xl flex justify-center bg-red-500 bg-opacity-50 rounded m-2">
                          <BsEmojiFrownFill />
                        </span>
                      </Match>
                      <Match when={submission.rating === 1}>
                        <span class="py-4 text-2xl flex justify-center bg-yellow-500 bg-opacity-50 rounded m-2">
                          <BsEmojiNeutralFill />
                        </span>
                      </Match>
                      <Match when={submission.rating === 2}>
                        <span class="py-4 text-2xl flex justify-center bg-green-500 bg-opacity-50 rounded m-2">
                          <BsEmojiSmileFill />
                        </span>
                      </Match>
                    </Switch>
                  </div>
                  <Show when={submission.review} fallback={<em class="opacity-70">No review</em>}>
                    <p>{submission.review}</p>
                  </Show>
                </li>
              )}
            </For>
          </ul>
        </div>
      </Show>
    </div>
  );
}
