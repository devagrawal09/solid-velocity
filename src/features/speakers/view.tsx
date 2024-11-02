import { createAsync } from '@solidjs/router';
import clsx from 'clsx';
import {
  getAllFeedbackFn,
  getCurrentSpeakerStatsFn,
  getRequestSpeakerFn,
  getSignedUpSpeakersFn
} from './api';
import { For, Show } from 'solid-js';
import { getSessionizeData } from '../sessionize/api';

export function ViewSpeakerFeedback() {
  const speakerId = createAsync(() => getRequestSpeakerFn());
  const data = createAsync(() => getSessionizeData());
  const signedUpSpeakers = createAsync(() => getSignedUpSpeakersFn());
  const feedbackSubmissions = createAsync(() => getAllFeedbackFn(), {
    initialValue: []
  });
  const hydratedSubmissions = () =>
    feedbackSubmissions().map(s => ({ ...s, speaker: getSpeaker(s.speakerId)! }));

  const getSpeaker = (speakerId: string) => data()?.speakers.find(s => s.id === speakerId);

  const isSpeakerSignedUp = () => signedUpSpeakers()?.includes(speakerId() || '');

  return (
    <Show when={isSpeakerSignedUp()}>
      <div class={clsx('rounded-sm text-center text-sm my-2 py-2 bg-white bg-opacity-10')}>
        <h2 class="text-xl font-semibold mb-2">Speaker Feedback</h2>
        <Show
          when={hydratedSubmissions().length}
          fallback={
            <>
              Speaker feedback has not yet been made visible! If you think this is a mistake please
              reach out to the Momentum organizers.
            </>
          }
        >
          <div class="text-left px-4">
            <ul class="grid grid-cols-2">
              <For each={hydratedSubmissions()}>
                {submission => (
                  <li class="border-x border-gray-500 p-2">
                    <p class="mb-2 text-lg">
                      <strong>{submission.speaker.fullName}</strong>
                    </p>
                    <p class="mb-2">
                      <strong>How would you rate this session?</strong>
                      <br />
                      {submission.data.rating}
                    </p>
                    <p class="mb-2">
                      <strong>Why did you choose to attend this session?</strong>
                      <br />
                      {submission.data.why}
                    </p>
                    <p class="mb-2">
                      <strong>What was your favorite thing about this session?</strong>
                      <br />
                      {submission.data.fav}
                    </p>
                    <p class="mb-2">
                      <strong>
                        What is one thing the speaker could improve the next time they present this
                        session?
                      </strong>
                      <br />
                      {submission.data.improve}
                    </p>
                    <p class="mb-2">
                      <strong>Any other comments for the speaker?</strong>
                      <br />
                      {submission.data.comments}
                    </p>
                  </li>
                )}
              </For>
            </ul>
          </div>
        </Show>
      </div>
    </Show>
  );
}

export function ViewSpeakerStats() {
  const stats = createAsync(() => getCurrentSpeakerStatsFn());

  return (
    <Show when={stats()}>
      <div class="rounded-sm text-center my-2 py-2 bg-white bg-opacity-10">
        Attendance: <strong>{stats()?.attendeeCount}</strong>
      </div>
    </Show>
  );
}
