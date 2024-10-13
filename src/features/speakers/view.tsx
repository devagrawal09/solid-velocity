import { createAsync, createAsyncStore } from '@solidjs/router';
import clsx from 'clsx';
import { getAllFeedbackFn } from './api';
import { createEffect, For } from 'solid-js';
import { getSessionizeData } from '../sessionize/api';

export function ViewSpeakerFeedback() {
  const data = createAsync(() => getSessionizeData());
  const feedbackSubmissions = createAsyncStore(() => getAllFeedbackFn(), {
    initialValue: []
  });

  const getSpeaker = (speakerId: string) => data()?.speakers.find(s => s.id === speakerId);

  createEffect(() => console.log(`feedbackSubmissions`, feedbackSubmissions()));

  return (
    <div class={clsx('rounded-sm text-sm  text-center my-2 py-2 bg-white bg-opacity-10')}>
      <h1>View Speaker Feedback</h1>
      <For each={feedbackSubmissions()}>
        {submission => <div>{getSpeaker(submission.speakerId)?.fullName}</div>}
      </For>
    </div>
  );
}
