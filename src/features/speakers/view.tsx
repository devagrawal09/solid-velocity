import { createAsync } from '@solidjs/router';
import clsx from 'clsx';
import { getAllFeedbackFn, getRequestSpeakerFn, getSignedUpSpeakersFn } from './api';
import { createSignal, For, Show } from 'solid-js';
import { getSessionizeData } from '../sessionize/api';
import { AdminMode } from '../admin';
import { SpeakerFeedbackFormData } from './store';
import { Speaker } from '../sessionize/store';

type Submission = {
  data: SpeakerFeedbackFormData;
  speaker: Speaker;
};

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

  const [selectedSubmission, setSelectionSubmission] = createSignal<Submission>();

  return (
    <AdminMode>
      <Show when={isSpeakerSignedUp()}>
        <div class={clsx('rounded-sm text-center text-sm my-2 py-2 bg-white bg-opacity-10')}>
          <h2 class="text-xl font-semibold mb-2">Speaker Feedback</h2>
          <Show
            when={hydratedSubmissions().length}
            fallback={
              <>
                Speaker feedback has not yet been made visible! If you think this is a mistake
                please reach out to the Momentum organizers.
              </>
            }
          >
            <div class="text-left px-4 sm:flex">
              <ul class="sm:w-1/3">
                <For each={hydratedSubmissions()}>
                  {submission => (
                    <li
                      class={clsx(
                        'cursor-pointer hover:bg-white hover:bg-opacity-20 border-b border-gray-500 p-2',
                        submission === selectedSubmission() && 'bg-momentum'
                      )}
                      role="button"
                      onClick={() => setSelectionSubmission(submission)}
                    >
                      {submission.speaker.fullName}
                    </li>
                  )}
                </For>
              </ul>
              <div class="sm:w-2/3 p-4">
                <Show when={selectedSubmission()} fallback={<>Select submission to view details</>}>
                  {selectedSubmission => (
                    <>
                      <p class="mb-2">
                        Feedback by <strong>{selectedSubmission().speaker.fullName}</strong>
                      </p>
                      <p class="mb-2">
                        <strong>How would you rate this session?</strong>
                        <br />
                        {selectedSubmission().data.rating}
                      </p>
                      <p class="mb-2">
                        <strong>Why did you choose to attend this session?</strong>
                        <br />
                        {selectedSubmission().data.why}
                      </p>
                      <p class="mb-2">
                        <strong>What was your favorite thing about this session?</strong>
                        <br />
                        {selectedSubmission().data.fav}
                      </p>
                      <p class="mb-2">
                        <strong>
                          What is one thing the speaker could improve the next time they present
                          this session?
                        </strong>
                        <br />
                        {selectedSubmission().data.improve}
                      </p>
                      <p class="mb-2">
                        <strong>Any other comments for the speaker?</strong>
                        <br />
                        {selectedSubmission().data.comments}
                      </p>
                    </>
                  )}
                </Show>
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </AdminMode>
  );
}
