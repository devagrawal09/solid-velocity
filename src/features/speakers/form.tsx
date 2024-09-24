import { cache, createAsync, useAction, useSubmission } from '@solidjs/router';
import { createForm } from '@tanstack/solid-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import clsx from 'clsx';
import { format } from 'date-fns';
import { createMemo, For, Show } from 'solid-js';
import { assertRequestAuth } from '~/auth';
import { Button } from '~/components/ui/button';
import { db } from '~/db/drizzle';
import { createEvent } from '~/lib/events';
import { createToastListener } from '~/lib/toast';
import { getAllAssignmentsFn, getFeedbackFn, submitFeedbackFn } from './api';
import { getSignedUpSpeakers, SpeakerFeedbackFormData, speakerFeedbackFormSchema } from './store';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { BiRegularHelpCircle } from 'solid-icons/bi';

export const getRequestSpeakerOrEmptyFn = cache(async () => {
  'use server';

  const { sessionClaims } = assertRequestAuth();

  const speakerId = sessionClaims.publicMetadata.speakerId;

  if (speakerId) return speakerId;
}, 'feedback/speakerId');

export const getSignedUpSpeakersOrEmptyFn = cache(async () => {
  'use server';

  const speakerId = await getRequestSpeakerOrEmptyFn();

  if (!speakerId) return [];

  const speakers = await db.transaction(tx => getSignedUpSpeakers(tx));

  if (speakers && speakers.includes(speakerId)) return speakers;
}, 'feedback/speakers');

export function createShowSpeakerFeedback(speakerId: () => string) {
  const currentSpeakerId = createAsync(() => getRequestSpeakerOrEmptyFn());
  const signedUpSpeakers = createAsync(() => getSignedUpSpeakersOrEmptyFn());

  const isSessionSpeakerSignedUp = () => signedUpSpeakers()?.includes(speakerId());
  const isCurrentSpeakerSignedUp = () => signedUpSpeakers()?.includes(currentSpeakerId() || ``);

  return createMemo(() => isSessionSpeakerSignedUp() && isCurrentSpeakerSignedUp());
}

export function SpeakerFeedbackForm(props: { sessionId: string }) {
  const [onFormSubmit, submitForm] = createEvent<SpeakerFeedbackFormData>();

  const feedbackSubmissions = createAsync(() => getFeedbackFn(props.sessionId), {
    initialValue: []
  });
  const submitFeedbackAction = useAction(submitFeedbackFn);
  const submitFeedbackSubmission = useSubmission(submitFeedbackFn);

  const onFeedbackSubmitted = onFormSubmit(data =>
    submitFeedbackAction({ data, sessionId: props.sessionId })
  );

  const onFeedbackError = onFeedbackSubmitted(res => (res instanceof Error ? res : null));
  const onFeedbackSuccess = onFeedbackSubmitted(res => (res instanceof Error ? null : res));

  createToastListener(
    onFeedbackSuccess(() => ({
      title: `Feedback submitted!`,
      description: `Thanks for your feedback!`,
      variant: 'success',
      duration: 2000
    })),
    onFeedbackError(err => ({
      title: `Error submitting feedback`,
      description: `Error: ${err.message}`,
      variant: 'error',
      duration: 2000
    }))
  );

  const latestFeedback = () => feedbackSubmissions()[feedbackSubmissions().length - 1];

  const latestFeedbackData = () => {
    const latestEvent = latestFeedback();
    if (latestEvent?.feedback.type === 'session-feedback') return latestEvent.feedback.data;
  };

  const form = createForm<SpeakerFeedbackFormData>(() => ({
    defaultValues: latestFeedbackData(),
    onSubmit: ({ value }) => submitForm(value)
  }));

  const ratings = [
    {
      value: `1`,
      color: `bg-red-500`
    },
    {
      value: `2`,
      color: `bg-orange-500`
    },
    {
      value: `3`,
      color: `bg-yellow-500`
    },
    {
      value: `4`,
      color: `bg-green-500`
    },
    {
      value: `5`,
      color: `bg-blue-500`
    }
  ];

  const currentSpeaker = createAsync(() => getRequestSpeakerOrEmptyFn());

  const allAssignments = createAsync(() => getAllAssignmentsFn(), { initialValue: {} });

  const isAssigned = () => allAssignments()?.[props.sessionId]?.includes(currentSpeaker() || '');

  return (
    <div
      class={clsx(
        'rounded-sm text-sm  text-center my-2 py-2',
        isAssigned() ? 'bg-momentum' : 'bg-white bg-opacity-10'
      )}
    >
      <Tooltip>
        <TooltipTrigger class="float-end mx-2 h-0">
          <BiRegularHelpCircle size={25} />
        </TooltipTrigger>
        <TooltipContent class="w-80">
          The Speaker Feedback Form replaces the regular feedback form for sessions that are
          available for the Speaker-to-speaker feedback program. If you assigned this session to
          yourself, you are required to submit feedback through this form. If you have not assigned
          this session, you are free to still attend this session and submit your feedback through
          this form. Once submitted, you can update your response as well.
        </TooltipContent>
      </Tooltip>

      <h2 class="text-xl font-semibold mb-2">Speaker Feedback Form</h2>

      <Show
        when={latestFeedback()}
        fallback={
          <Show
            when={isAssigned()}
            fallback={
              <h3>
                You have not assigned this session to yourself for speaker-to-speaker feedback. You
                can still submit the feedback form.
              </h3>
            }
          >
            <h3>
              You have assigned this session to yourself for speaker-to-speaker feedback. You must
              submit the feedback form.
            </h3>
          </Show>
        }
      >
        {feedback => (
          <h3 class="font-bold">Last submitted: {format(feedback().timestamp, 'h:mm a, MMM d')}</h3>
        )}
      </Show>
      <form
        class="p-2 flex flex-col gap-4 text-left"
        onSubmit={e => {
          e.preventDefault();
          e.stopPropagation();
          if (submitFeedbackSubmission.pending) return;
          form.handleSubmit();
        }}
      >
        <form.Field
          name="rating"
          validatorAdapter={zodValidator()}
          validators={{
            onBlur: speakerFeedbackFormSchema.shape.rating
          }}
          children={field => (
            <div class="flex flex-col gap-2">
              How would you rate this session?
              <div class="grid grid-cols-5 gap-2">
                <For each={ratings}>
                  {rating => (
                    <div>
                      <input
                        class="appearance-none peer h-0"
                        type="radio"
                        name={field().name}
                        value={field().state.value || ''}
                        checked={field().state.value === parseInt(rating.value)}
                        onChange={e => field().handleChange(parseInt(rating.value) as any)}
                        id={rating.value}
                      />
                      <label
                        for={rating.value}
                        class={`text-center flex flex-col justify-center text-xl -mt-4 h-10 bg-opacity-50 rounded disabled:outline peer-checked:bg-opacity-80 peer-checked:border-2 peer-hover:bg-opacity-100 peer-focus:bg-opacity-100 ${rating.color}`}
                      >
                        {rating.value}
                      </label>
                    </div>
                  )}
                </For>
              </div>
              <For each={field().state.meta.errors}>
                {error => <em class="text-red-400">{error}</em>}
              </For>
            </div>
          )}
        />
        <form.Field
          name="why"
          validatorAdapter={zodValidator()}
          validators={{
            onBlur: speakerFeedbackFormSchema.shape.why
          }}
          children={field => (
            <div class="flex flex-col gap-2">
              <label for={field().name}>Why did you choose to attend this session?</label>
              <textarea
                id={field().name}
                value={field().state.value || ''}
                onBlur={field().handleBlur}
                onInput={e => field().handleChange(e.target.value)}
                class="text-black px-3 py-2 rounded"
              />
              <For each={field().state.meta.errors}>
                {error => <em class="text-red-400">{error}</em>}
              </For>
            </div>
          )}
        />
        <form.Field
          name="fav"
          validatorAdapter={zodValidator()}
          validators={{
            onBlur: speakerFeedbackFormSchema.shape.fav
          }}
          children={field => (
            <div class="flex flex-col gap-2">
              <label for={field().name}>
                What was your favorite thing about this session?
                <br />
                <span class="text-xs">
                  What did you learn from this session? Is there anything it made you think about?
                </span>
              </label>
              <textarea
                id={field().name}
                value={field().state.value || ''}
                onBlur={field().handleBlur}
                onInput={e => field().handleChange(e.target.value)}
                class="text-black px-3 py-2 rounded"
              />
              <For each={field().state.meta.errors}>
                {error => <em class="text-red-400">{error}</em>}
              </For>
            </div>
          )}
        />
        <form.Field
          name="improve"
          validatorAdapter={zodValidator()}
          validators={{
            onBlur: speakerFeedbackFormSchema.shape.improve
          }}
          children={field => (
            <div class="flex flex-col gap-2">
              <label for={field().name}>
                What is one thing the speaker could improve the next time they present this session?
              </label>
              <textarea
                id={field().name}
                value={field().state.value || ''}
                onBlur={field().handleBlur}
                onInput={e => field().handleChange(e.target.value)}
                class="text-black px-3 py-2 rounded"
              />
              <For each={field().state.meta.errors}>
                {error => <em class="text-red-400">{error}</em>}
              </For>
            </div>
          )}
        />
        <form.Field
          name="comments"
          validatorAdapter={zodValidator()}
          validators={{
            onBlur: speakerFeedbackFormSchema.shape.comments
          }}
          children={field => (
            <div class="flex flex-col gap-2">
              <label for={field().name}>Any other comments for the speaker?</label>
              <textarea
                id={field().name}
                value={field().state.value || ''}
                onBlur={field().handleBlur}
                onInput={e => field().handleChange(e.target.value)}
                class="text-black px-3 py-2 rounded"
              />
              <For each={field().state.meta.errors}>
                {error => <em class="text-red-400">{error}</em>}
              </For>
            </div>
          )}
        />

        <Button
          type="submit"
          class="bg-momentum rounded m-auto py-2 px-4"
          disabled={submitFeedbackSubmission.pending}
        >
          Submit
        </Button>
      </form>
    </div>
  );
}
