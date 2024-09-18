import { Title } from '@solidjs/meta';
import { createAsync, RouteDefinition, useAction, useParams } from '@solidjs/router';
import { createForm } from '@tanstack/solid-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import clsx from 'clsx';
import { format } from 'date-fns';
import { FaSolidArrowUpShortWide, FaSolidClock, FaSolidMapPin, FaSolidTags } from 'solid-icons/fa';
import { createEffect, For, Show, Suspense } from 'solid-js';
import { Button } from '~/components/ui/button';
import { showToast } from '~/components/ui/toast';
import { getSessionizeData } from '~/features/sessionize/api';
import { Category, Session } from '~/features/sessionize/store';
import {
  getAllAssignmentsFn,
  getFeedbackFn,
  getRequestSpeakerFn,
  submitFeedbackFn
} from '~/features/speakers/api';
import { SpeakerImpersonator } from '~/features/speakers/impersonator';
import { SpeakerFeedbackFormData, speakerFeedbackFormSchema } from '~/features/speakers/store';
import { createEvent, createListener, createTopic, Handler } from '~/lib/events';

export const route = {
  load({ params }) {
    getRequestSpeakerFn();
    getSessionizeData();
    getFeedbackFn(params.sessionId);
    getAllAssignmentsFn();
  }
} satisfies RouteDefinition;

export default function SpeakerFeedbackPage() {
  const data = createAsync(() => getSessionizeData());
  const params = useParams<{ sessionId: string }>();
  const session = () => data()?.sessions.find(s => s.id === params.sessionId);
  const room = () => data()?.rooms.find(r => r.id === session()?.roomId);
  const sessionSpeaker = () =>
    data()?.speakers.filter(speaker => session()?.speakers.includes(speaker.id))[0];

  return (
    <main class="px-5">
      <Title>Speaker Feedback | Momentum Developer Conference</Title>
      <Suspense fallback={<div>Loading...</div>}>
        <Show when={session()} fallback={<div class="text-center">Loading...</div>}>
          {session => (
            <>
              <div class="flex justify-between">
                <h1 class="text-xl font-semibold my-4">{session().title}</h1>
                <SpeakerImpersonator />
              </div>
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

              <Show when={sessionSpeaker()}>
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
            </>
          )}
        </Show>
      </Suspense>
    </main>
  );
}

function categoriesForSession(
  category: Category,
  session: Session
): { sort: number; id: number; name: string }[] {
  return category.items.filter(item => session.categoryItems.includes(item.id));
}

function Feedback(props: { sessionId: string }) {
  const [onFormSubmit, submitForm] = createEvent<SpeakerFeedbackFormData>();

  const feedback = createAsync(() => getFeedbackFn(props.sessionId));
  const submitFeedbackAction = useAction(submitFeedbackFn);

  createEffect(() => console.log(`feedback`, feedback()));

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

  const form = createForm<SpeakerFeedbackFormData>(() => ({
    defaultValues: {
      rating: 3,
      why: ``,
      fav: ``,
      improve: ``,
      comments: ``
    },
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

  const currentSpeaker = createAsync(() => getRequestSpeakerFn());

  const allAssignments = createAsync(() => getAllAssignmentsFn(), { initialValue: {} });

  const isAssigned = () => allAssignments()?.[props.sessionId]?.includes(currentSpeaker() || '');

  return (
    <div
      class={clsx(
        ' rounded-sm text-sm  text-center my-2 py-2',
        isAssigned() ? 'bg-momentum' : 'bg-white bg-opacity-10'
      )}
    >
      <h2 class="text-xl font-semibold mb-2">Speaker Feedback Form</h2>
      <form
        class="p-2 flex flex-col gap-4 text-left"
        onSubmit={e => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <form.Field
          name="rating"
          validatorAdapter={zodValidator()}
          validators={{
            onChange: speakerFeedbackFormSchema.shape.rating
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
                        value={field().state.value}
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
            onChange: speakerFeedbackFormSchema.shape.why
          }}
          children={field => (
            <div class="flex flex-col gap-2">
              <label for={field().name}>Why did you choose to attend this session?</label>
              <textarea
                id={field().name}
                value={field().state.value}
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
            onChange: speakerFeedbackFormSchema.shape.fav
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
                value={field().state.value}
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
            onChange: speakerFeedbackFormSchema.shape.improve
          }}
          children={field => (
            <div class="flex flex-col gap-2">
              <label for={field().name}>
                What is one thing the speaker could improve the next time they present this session?
              </label>
              <textarea
                id={field().name}
                value={field().state.value}
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
            onChange: speakerFeedbackFormSchema.shape.comments
          }}
          children={field => (
            <div class="flex flex-col gap-2">
              <label for={field().name}>Any other comments for the speaker?</label>
              <textarea
                id={field().name}
                value={field().state.value}
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

        <Button type="submit" class="bg-momentum rounded m-auto py-2 px-4">
          Submit
        </Button>
      </form>
    </div>
  );
}

type ToastProps = Parameters<typeof showToast>[0];

function createToastListener(...handlers: Handler<ToastProps>[]) {
  const handler = createTopic(...handlers);
  createListener(handler, showToast);
}
