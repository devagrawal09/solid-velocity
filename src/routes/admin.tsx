import { clerkClient } from '@clerk/clerk-sdk-node';
import { Title } from '@solidjs/meta';
import { A, createAsync, createAsyncStore, useAction, useSubmission } from '@solidjs/router';
import clsx from 'clsx';
import { format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { FaSolidChevronDown, FaSolidChevronRight } from 'solid-icons/fa';
import { createMemo, createSignal, For, Show, Suspense } from 'solid-js';
import { assertRequestAdmin } from '~/auth';
import { Button } from '~/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { useAdmin } from '~/features/admin';
import { getAllS2sEvents, uploadSpeakerSheet } from '~/features/admin/speakers';
import { getSessionizeData } from '~/features/sessionize/api';
import { Session, Speaker } from '~/features/sessionize/store';
import { approveFeedbackFn } from '~/features/speakers/api';
import { SpeakerFeedbackFormData } from '~/features/speakers/store';
import { createEvent } from '~/lib/events';
import { createToastListener } from '~/lib/toast';

async function getUsers() {
  'use server';

  await assertRequestAdmin();
  const { data, totalCount } = await clerkClient.users.getUserList({ limit: 200 });
  console.log({ totalCount });
  const speakerUsers = data
    .filter(u => !!u.publicMetadata.speakerId && u.publicMetadata.role !== 'admin')
    .map(u => JSON.parse(JSON.stringify(u)));
  return speakerUsers;
}

export default function AdminPage() {
  return (
    <main class="px-2 sm:px-5">
      <Title>Admin Dashboard | Momentum Developer Conference</Title>
      <main class="flex-1 overflow-auto p-6">
        <SpeakerFeedbackLog />
        <SpeakerAssignments />
        <SessionAssignments />
        <UploadSpeakerSheet />
        <SpeakerFeedbackApproval />
        <GlobalClock />
      </main>
    </main>
  );
}

type SpeakerAssignmentStats = { assigned: Set<string>; notAssigned: Set<string> };
type SessionAssignmentStats = { sessionId: string; speakerIds: Array<string> };
const defaultStats = () =>
  ({
    assigned: new Set(),
    notAssigned: new Set()
  }) satisfies SpeakerAssignmentStats;
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
                    {event.feedback.type === 'feedback-approved' && (
                      <>
                        Approved {speaker()?.fullName}'s feedback for{' '}
                        <A href={`/session/${event.feedback.sessionId}`} class="underline">
                          {getSession(event.feedback.sessionId)?.title}
                        </A>
                        .
                      </>
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

function SpeakerAssignments() {
  const [open, setOpen] = createSignal(false);
  const speakerFeedbackEvents = createAsync(() => getAllS2sEvents());
  const data = createAsync(() => getSessionizeData());

  const chronologicalEvents = () =>
    speakerFeedbackEvents()?.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

  const speakerAssignmentStats = createMemo(
    () =>
      chronologicalEvents()?.reduce((acc, event) => {
        if (event.feedback.type === 'speaker-signedup') {
          acc.notAssigned.add(event.speakerId);
        }

        if (event.feedback.type === 'session-assigned') {
          acc.assigned.add(event.speakerId);
          acc.notAssigned.delete(event.speakerId);
        }

        if (event.feedback.type === 'session-unassigned') {
          acc.notAssigned.add(event.speakerId);
          acc.assigned.delete(event.speakerId);
        }

        return acc;
      }, defaultStats()) || defaultStats()
  );
  const getSpeaker = (speakerId: string) => data()?.speakers.find(s => s.id === speakerId);
  const getSpeakerEmail = (speakerId: string) =>
    speakerUsers()?.find(u => u.publicMetadata.speakerId === speakerId)?.emailAddresses[0]
      .emailAddress;
  const speakerUsers = createAsync(() => getUsers());

  return (
    <Collapsible open={open()} onOpenChange={setOpen}>
      <CollapsibleTrigger class="bg-momentum py-2 px-4 w-full my-1 rounded-xl flex gap-3 items-center text-xl">
        {open() ? <FaSolidChevronDown /> : <FaSolidChevronRight />}
        Speaker Assignments
      </CollapsibleTrigger>
      <CollapsibleContent class="border rounded-xl p-9 my-2 border-gray-700">
        <Suspense fallback={<>Loading Assignments...</>}>
          <table>
            <thead>
              <tr>
                <th>Speaker</th>
                <th>Email</th>
                <th>Assigned</th>
              </tr>
            </thead>
            <tbody>
              <For each={[...speakerAssignmentStats().assigned]}>
                {speakerId => {
                  return (
                    <tr>
                      <td class="border-b border-gray-500 p-2">
                        {getSpeaker(speakerId)?.fullName}
                      </td>
                      <td class="border-b border-gray-500 p-2">{getSpeakerEmail(speakerId)}</td>
                      <td class="border-b border-gray-500 p-2">Yes</td>
                    </tr>
                  );
                }}
              </For>
              <For each={[...speakerAssignmentStats().notAssigned]}>
                {speakerId => (
                  <tr>
                    <td class="border-b border-gray-500 p-2">{getSpeaker(speakerId)?.fullName}</td>
                    <td class="border-b border-gray-500 p-2">{getSpeakerEmail(speakerId)}</td>
                    <td class="border-b border-gray-500 p-2">No</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Suspense>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SessionAssignments() {
  const [open, setOpen] = createSignal(false);
  const data = createAsync(() => getSessionizeData());
  const speakerFeedbackEvents = createAsync(() => getAllS2sEvents());
  const getSession = (sessionId: string) => data()?.sessions.find(s => s.id === sessionId);
  const chronologicalEvents = () =>
    speakerFeedbackEvents()?.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

  const getSpeaker = (speakerId: string) => data()?.speakers.find(s => s.id === speakerId);
  const getSessionBySpeakerId = (speakerId: string) =>
    data()?.sessions.find(s => s.speakers.includes(speakerId));
  const sessionAssignmentStats = createMemo(() =>
    chronologicalEvents()?.reduce((acc, event) => {
      const sessionId = getSessionBySpeakerId(event.speakerId)?.id;
      if (!sessionId) return acc;

      if (event.feedback.type === 'speaker-signedup') {
        return [
          ...acc,
          {
            sessionId: sessionId,
            speakerIds: []
          }
        ];
      }

      if (event.feedback.type === 'speaker-removed') {
        return acc.filter(s => s.sessionId !== sessionId);
      }

      if (event.feedback.type === 'session-assigned') {
        return acc.map(s =>
          // @ts-expect-error
          s.sessionId === event.feedback.sessionId
            ? { ...s, speakerIds: [...s.speakerIds, event.speakerId] }
            : s
        );
      }

      if (event.feedback.type === 'session-unassigned') {
        return acc.map(s =>
          // @ts-expect-error
          s.sessionId === event.feedback.sessionId
            ? { ...s, speakerIds: s.speakerIds.filter(id => id !== event.speakerId) }
            : s
        );
      }

      return acc;
    }, [] as SessionAssignmentStats[])
  );

  return (
    <Collapsible open={open()} onOpenChange={setOpen}>
      <CollapsibleTrigger class="bg-momentum py-2 px-4 w-full my-1 rounded-xl flex gap-3 items-center text-xl">
        {open() ? <FaSolidChevronDown /> : <FaSolidChevronRight />}
        Session Assignments
      </CollapsibleTrigger>
      <CollapsibleContent class="border rounded-xl p-9 my-2 border-gray-700">
        <Suspense fallback={<>Loading Assignments...</>}>
          <table>
            <thead>
              <tr>
                <th>Session</th>
                <th>Speakers</th>
              </tr>
            </thead>
            <tbody>
              <For each={sessionAssignmentStats()}>
                {assignment => (
                  <tr
                    class={clsx(
                      `bg-opacity-20`,
                      assignment.speakerIds.length === 0 && `bg-red-500`,
                      assignment.speakerIds.length === 1 && `bg-yellow-500`,
                      assignment.speakerIds.length > 1 && `bg-blue-500`
                    )}
                  >
                    <td class="border-b border-gray-500 p-2">
                      {getSession(assignment.sessionId)?.title}
                    </td>
                    <td class="border-b border-gray-500 p-2">
                      {assignment.speakerIds.map(s => getSpeaker(s)?.fullName).join(`, `) || `None`}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
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

function GlobalClock() {
  const [open, setOpen] = createSignal(false);
  const { clock, overrideClock } = useAdmin();

  return (
    <Collapsible open={open()} onOpenChange={setOpen}>
      <CollapsibleTrigger class="bg-momentum py-2 px-4 w-full my-1 rounded-xl flex gap-3 items-center text-xl">
        {open() ? <FaSolidChevronDown /> : <FaSolidChevronRight />}
        Global Clock Override
      </CollapsibleTrigger>
      <CollapsibleContent class="border rounded-xl p-9 my-2 border-gray-700">
        Current Time:{' '}
        {clock() ? utcToZonedTime(new Date(clock()), 'America/New_York').toString() : ``}
        <br />
        Override Time{' '}
        <input
          type="datetime-local"
          value={clock()}
          class="text-black"
          onInput={e => overrideClock(e.currentTarget.value)}
        />
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

type Submission = {
  data: SpeakerFeedbackFormData;
  session: Session;
  speaker: Speaker;
  approved: boolean;
};

function SpeakerFeedbackApproval() {
  const [open, setOpen] = createSignal(false);

  const speakerFeedbackEvents = createAsync(() => getAllS2sEvents());

  const chronologicalEvents = () =>
    speakerFeedbackEvents()?.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

  const data = createAsync(() => getSessionizeData());
  const getSession = (sessionId: string) => data()?.sessions.find(s => s.id === sessionId);
  const getSpeaker = (speakerId: string) => data()?.speakers.find(s => s.id === speakerId);

  const feedbackSubmissions = () =>
    chronologicalEvents()?.reduce((acc, event) => {
      if (event.feedback.type === 'session-feedback') {
        const session = getSession(event.feedback.sessionId)!;
        const speaker = getSpeaker(event.speakerId)!;

        const existing = acc.findIndex(
          s => s.speaker.id === speaker?.id && s.session.id === session?.id
        );

        if (existing !== -1) {
          acc[existing].data = event.feedback.data;
        } else {
          acc.push({ data: event.feedback.data, session, speaker, approved: false });
        }
      }

      if (event.feedback.type === 'feedback-approved') {
        const index = acc.findIndex(
          // @ts-expect-error
          s => s.speaker.id === event.speakerId && s.session.id === event.feedback.sessionId
        );
        if (index !== -1) {
          acc[index].approved = true;
        }
      }
      return acc;
    }, [] as Submission[]);

  const approveFeedback = useAction(approveFeedbackFn);
  const approveFeedbackSubmission = useSubmission(approveFeedbackFn);

  const [selectedSubmission, setSelectionSubmission] = createSignal<Submission>();

  return (
    <Collapsible open={open()} onOpenChange={setOpen}>
      <CollapsibleTrigger class="bg-momentum py-2 px-4 w-full my-1 rounded-xl flex gap-3 items-center text-xl">
        {open() ? <FaSolidChevronDown /> : <FaSolidChevronRight />}
        Speaker Feedback Approval
      </CollapsibleTrigger>
      <CollapsibleContent class="border rounded-xl p-9 my-2 border-gray-700 flex">
        <table class="w-1/3">
          <thead>
            <tr>
              <th>Speaker</th>
              <th>Session</th>
              <th>Approved</th>
            </tr>
          </thead>
          <tbody>
            <For each={feedbackSubmissions()}>
              {submission => (
                <tr
                  class={clsx(
                    'cursor-pointer hover:bg-white hover:bg-opacity-20',
                    submission === selectedSubmission() && 'bg-momentum'
                  )}
                  role="button"
                  onClick={() => setSelectionSubmission(submission)}
                >
                  <td class="border-b border-gray-500 p-2">{submission.speaker.fullName}</td>
                  <td class="border-b border-gray-500 p-2">{submission.session.title}</td>
                  <td class="border-b border-gray-500 p-2">
                    <Show
                      when={!submission.approved}
                      fallback={
                        <Button variant="success" disabled>
                          Approved
                        </Button>
                      }
                    >
                      <Button
                        variant="success"
                        onClick={() =>
                          approveFeedback({
                            sessionId: submission.session.id,
                            speakerId: submission.speaker.id
                          })
                        }
                        disabled={approveFeedbackSubmission.pending}
                      >
                        Approve
                      </Button>
                    </Show>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
        <div class="w-2/3 p-4">
          <Show when={selectedSubmission()} fallback={<>Select submission to view details</>}>
            {selectedSubmission => (
              <>
                <p class="mb-2">
                  Feedback by <strong>{selectedSubmission().speaker.fullName}</strong> for{' '}
                  <strong>{selectedSubmission().session.title}</strong>
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
                    What is one thing the speaker could improve the next time they present this
                    session?
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
      </CollapsibleContent>
    </Collapsible>
  );
}
