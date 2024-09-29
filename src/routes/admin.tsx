import { Title } from '@solidjs/meta';
import {
  A,
  action,
  cache,
  createAsync,
  createAsyncStore,
  redirect,
  useAction,
  useSubmission
} from '@solidjs/router';
import { format } from 'date-fns';
import { FaSolidChevronDown, FaSolidChevronRight } from 'solid-icons/fa';
import { createSignal, For, Match, Show, Suspense, Switch } from 'solid-js';
import { assertRequestAuth } from '~/auth';
import { Button } from '~/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { storage } from '~/db/kv';
import { getAllS2sEvents, uploadSpeakerSheet } from '~/features/admin/speakers';
import { getSessionizeData } from '~/features/sessionize/api';
import { createEvent, createListener } from '~/lib/events';
import { createToastListener } from '~/lib/toast';

const getData = cache(async () => {
  'use server';

  const auth = assertRequestAuth();
  if (auth.sessionClaims.publicMetadata.role !== 'admin') {
    throw redirect('/');
  }

  return Promise.all(
    (await storage.getKeys()).map(async key => {
      const [base, ...parts] = key.split(':');
      const storageKey = parts.join(`:`);
      return { key: storageKey, value: await storage.getItem(storageKey) };
    })
  );
}, 'admin-data');

const removeData = action(async key => {
  'use server';
  console.log(`removing ${key}`);
  const auth = assertRequestAuth();
  if (auth.sessionClaims.publicMetadata.role !== 'admin') {
    throw redirect('/');
  }

  await storage.removeItem(key);
});

export default function Home() {
  return (
    <main class="px-2 sm:px-5">
      <Title>Schedule | Momentum Developer Conference</Title>
      <main class="flex-1 overflow-auto p-6">
        <SpeakerFeedbackLog />
        <UploadSpeakerSheet />
      </main>
    </main>
  );
}

function SpeakerFeedbackLog() {
  const [open, setOpen] = createSignal(false);

  const speakerFeedbackEvents = createAsyncStore(() => getAllS2sEvents());
  const data = createAsync(() => getSessionizeData());
  const getSession = (sessionId: string) => data()?.sessions.find(s => s.id === sessionId);

  return (
    <Collapsible open={open()} onOpenChange={setOpen}>
      <CollapsibleTrigger class="bg-momentum py-2 px-4 w-full my-1 rounded-xl flex gap-3 items-center text-xl">
        {open() ? <FaSolidChevronDown /> : <FaSolidChevronRight />}
        Speaker Feedback Log
      </CollapsibleTrigger>
      <CollapsibleContent class="border rounded-xl p-9 my-2 border-gray-700">
        <Suspense fallback={<>Loading Log...</>}>
          <ol>
            <For each={speakerFeedbackEvents()}>
              {event => {
                const speaker = () => data()?.speakers.find(s => s.id === event.speakerId);

                return (
                  <li class="my-2">
                    {format(new Date(event.timestamp), 'MMM d, h:mm a')}:{' '}
                    {event.feedback.type === 'session-assigned' && (
                      <>
                        {speaker()?.fullName} assigned to{' '}
                        <A href={`/session/${event.feedback.sessionId}`} class="underline">
                          {getSession(event.feedback.sessionId)?.title}
                        </A>
                        .
                      </>
                    )}
                    {event.feedback.type === 'session-unassigned' && (
                      <>
                        {speaker()?.fullName} assigned to{' '}
                        <A href={`/session/${event.feedback.sessionId}`} class="underline">
                          {getSession(event.feedback.sessionId)?.title}
                        </A>
                        .
                      </>
                    )}
                    {event.feedback.type === 'session-feedback' && (
                      <>
                        {speaker()?.fullName} submitted feedback for{' '}
                        <A href={`/session/${event.feedback.sessionId}`} class="underline">
                          {getSession(event.feedback.sessionId)?.title}
                        </A>
                        .
                      </>
                    )}
                    {event.feedback.type === 'speaker-signedup' && (
                      <>{speaker()?.fullName} signed up for s2s.</>
                    )}
                    {event.feedback.type === 'speaker-removed' && (
                      <>{speaker()?.fullName} removed from s2s.</>
                    )}
                  </li>
                );
              }}
            </For>
          </ol>
        </Suspense>
      </CollapsibleContent>
    </Collapsible>
  );
}

function UploadSpeakerSheet() {
  const [open, setOpen] = createSignal(false);
  const [onSubmit, emitSubmit] = createEvent<FormData>();

  const uploadSpeakerSheetAction = useAction(uploadSpeakerSheet);
  const uploadSubmission = useSubmission(uploadSpeakerSheet);

  const onFileUpload = onSubmit(formData => formData.get('file') as File);
  const onFileRead = onFileUpload(readFileAsync);
  const onUploadResult = onFileRead(uploadSpeakerSheetAction);

  createToastListener(
    onUploadResult(({ users, validEntries, invalidEntries }) => ({
      title: 'Upload Speaker Sheet',
      description: `Uploaded ${validEntries.length} speakers, ${invalidEntries.length} invalid entries, Upserted ${users.length} users`
    }))
  );

  return (
    <Collapsible open={open()} onOpenChange={setOpen}>
      <CollapsibleTrigger class="bg-momentum py-2 px-4 w-full my-1 rounded-xl flex gap-3 items-center text-xl">
        {open() ? <FaSolidChevronDown /> : <FaSolidChevronRight />}
        Speaker Sheet Upload
      </CollapsibleTrigger>
      <CollapsibleContent class="border rounded-xl p-9 my-2 border-gray-700">
        <form
          class="flex flex-col gap-4 max-w-md"
          onSubmit={e => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            emitSubmit(formData);
          }}
        >
          <p>
            Register speakers with their email and speaker id to allow them access to the speaker
            dashboard automatically on login.
          </p>
          <div>
            <label class="text-base mb-2 block">Upload CSV file</label>
            <input
              type="file"
              class="w-full text-black font-semibold text-sm bg-white border file:cursor-pointer cursor-pointer file:border-0 file:py-3 file:px-4 file:mr-4 file:bg-gray-100 file:hover:bg-gray-200 file:text-gray-500 rounded"
              name="file"
            />
          </div>
          <Button variant="success" type="submit" disabled={uploadSubmission.pending}>
            Submit
          </Button>
        </form>
      </CollapsibleContent>
    </Collapsible>
  );
}

function readFileAsync(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => reader.result && resolve(reader.result.toString());
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
