import { clerkClient } from '@clerk/clerk-sdk-node';
import { Title } from '@solidjs/meta';
import {
  A,
  createAsync,
  createAsyncStore,
  useAction,
  useSubmission,
  useSubmissions
} from '@solidjs/router';
import clsx from 'clsx';
import { format } from 'date-fns';
import { BsEmojiFrownFill, BsEmojiNeutralFill, BsEmojiSmileFill } from 'solid-icons/bs';
import { FaSolidChevronDown, FaSolidChevronRight, FaSolidObjectGroup } from 'solid-icons/fa';
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  Show,
  Suspense,
  Switch
} from 'solid-js';
import { assertRequestAdmin } from '~/auth';
import { Button } from '~/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { getAllS2sEvents, uploadSpeakerSheet } from '~/features/admin/speakers';
import {
  approveAllAttendeeFeedbackFn,
  approveAttendeeFeedbackFn,
  getAllSessionFeedbackFn,
  unapproveAttendeeFeedbackFn
} from '~/features/feedback/api';
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
        {/* <GlobalClock /> */}
        <AttendeeFeedbackApproval />
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
                        {speaker()?.fullName} unassigned from{' '}
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

        if (event.feedback.type === 'speaker-removed') {
          acc.assigned.delete(event.speakerId);
          acc.notAssigned.delete(event.speakerId);
        }

        if (event.feedback.type === 'session-assigned') {
          acc.assigned.add(event.speakerId);
          acc.notAssigned.delete(event.speakerId);
        }

        if (event.feedback.type === 'session-unassigned') {
          acc.assigned.delete(event.speakerId);
          acc.notAssigned.add(event.speakerId);
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

// function GlobalClock() {
//   const [open, setOpen] = createSignal(false);
//   const { clock, overrideClock } = useAdmin();

//   return (
//     <Collapsible open={open()} onOpenChange={setOpen}>
//       <CollapsibleTrigger class="bg-momentum py-2 px-4 w-full my-1 rounded-xl flex gap-3 items-center text-xl">
//         {open() ? <FaSolidChevronDown /> : <FaSolidChevronRight />}
//         Global Clock Override
//       </CollapsibleTrigger>
//       <CollapsibleContent class="border rounded-xl p-9 my-2 border-gray-700">
//         Current Time:{' '}
//         {clock() ? utcToZonedTime(new Date(clock()), 'America/New_York').toString() : ``}
//         <br />
//         Override Time{' '}
//         <input
//           type="datetime-local"
//           value={clock()}
//           class="text-black"
//           onInput={e => overrideClock(e.currentTarget.value)}
//         />
//       </CollapsibleContent>
//     </Collapsible>
//   );
// }

function readFileAsync(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => reader.result && resolve(reader.result.toString());
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

type SpeakerFeedbackSubmission = {
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
    }, [] as SpeakerFeedbackSubmission[]);

  const [onApprove, emitApprove] = createEvent<{
    speakerId: string;
    sessionId: string;
  }>();
  const approveFeedback = useAction(approveFeedbackFn);
  const approveFeedbackSubmission = useSubmissions(approveFeedbackFn);
  const isApproving = (speakerId: string, sessionId: string) =>
    approveFeedbackSubmission.find(
      s => s.input[0].speakerId === speakerId && s.input[0].sessionId === sessionId
    )?.pending;

  const onApproved = onApprove(approveFeedback);
  createToastListener(
    onApproved(() => ({
      title: 'Feedback Approved',
      description: `Feedback approved`
    }))
  );
  const [selectedSubmission, setSelectionSubmission] = createSignal<SpeakerFeedbackSubmission>();

  return (
    <Collapsible open={open()} onOpenChange={setOpen}>
      <CollapsibleTrigger class="bg-momentum py-2 px-4 w-full my-1 rounded-xl flex gap-3 items-center text-xl">
        {open() ? <FaSolidChevronDown /> : <FaSolidChevronRight />}
        Speaker Feedback Approval
      </CollapsibleTrigger>
      <CollapsibleContent class="border rounded-xl p-9 my-2 border-gray-700">
        <Button
          variant="success"
          disabled={approveFeedbackSubmission.pending}
          onClick={() => {
            feedbackSubmissions()?.forEach(submission => {
              emitApprove({
                sessionId: submission.session.id,
                speakerId: submission.speaker.id
              });
            });
          }}
        >
          Approve All Speaker Feedback
        </Button>
        <div class="flex mt-8 h-[800px] overflow-scroll">
          <table class="w-1/3 overflow-scroll">
            <thead class="sticky top-0 bg-white text-black">
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
                            emitApprove({
                              sessionId: submission.session.id,
                              speakerId: submission.speaker.id
                            })
                          }
                          disabled={isApproving(submission.speaker.id, submission.session.id)}
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
          <div class="w-2/3 p-4 sticky top-0">
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
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

type AttendeeFeedbackSubmission = {
  userId: string;
  sessionId: string;
  rating?: number;
  review?: string;
  approved: boolean;
};

function AttendeeFeedbackApproval() {
  const [open, setOpen] = createSignal(true);

  const attendeeFeedbackEvents = createAsync(() => getAllSessionFeedbackFn());

  const data = createAsync(() => getSessionizeData());
  const getSession = (sessionId: string) => data()?.sessions.find(s => s.id === sessionId);
  const getSpeaker = (speakerId?: string) =>
    speakerId ? data()?.speakers.find(s => s.id === speakerId) : undefined;

  const feedbackSubmissions = () =>
    attendeeFeedbackEvents()?.reduce(
      (acc, event) => {
        const session = acc[event.sessionId];

        if (session) {
          const existing = session.find(s => s.userId === event.userId);

          if (existing) {
            if (event.feedback.type === 'rated') {
              existing.rating = event.feedback.rating;
            }

            if (event.feedback.type === 'reviewed') {
              existing.review = event.feedback.review;
            }

            if (event.feedback.type === 'approved') {
              existing.approved = true;
            }

            if (event.feedback.type === 'unapproved') {
              existing.approved = false;
            }
          } else {
            session.push({
              ...event,
              ...event.feedback,
              approved: false
            } satisfies AttendeeFeedbackSubmission);
          }

          return acc;
        }

        return {
          ...acc,
          [event.sessionId]: [
            {
              ...event,
              ...event.feedback,
              approved: false
            } satisfies AttendeeFeedbackSubmission
          ]
        };
      },
      {} as Record<string, AttendeeFeedbackSubmission[]>
    ) || {};

  const [onApprove, emitApprove] = createEvent<AttendeeFeedbackSubmission>();
  const [onUnapprove, emitUnapprove] = createEvent<AttendeeFeedbackSubmission>();
  const [onApproveAll, emitApproveAll] = createEvent();

  const onApproved = onApprove(useAction(approveAttendeeFeedbackFn));
  const onUnapproved = onUnapprove(useAction(unapproveAttendeeFeedbackFn));
  const onApprovedAll = onApproveAll(useAction(approveAllAttendeeFeedbackFn));

  const approvingAllSubmission = useSubmission(approveAllAttendeeFeedbackFn);

  createToastListener(
    onApproved(() => ({
      title: 'Feedback Approved',
      description: `Feedback approved`,
      variant: 'success'
    })),
    onUnapproved(() => ({
      title: 'Feedback Unapproved',
      description: `Feedback unapproved`,
      variant: 'destructive'
    })),
    onApprovedAll(() => ({
      title: 'All Feedback Approved',
      description: `All feedback approved`,
      variant: 'success'
    }))
  );

  const [ratingFilter, setRatingFilter] = createSignal<0 | 1 | 2>();

  const unapproveCount = () =>
    Object.values(feedbackSubmissions())
      .flat()
      .reduce((acc, entry) => (entry.approved ? acc : acc + 1), 0);

  return (
    <Collapsible open={open()} onOpenChange={setOpen}>
      <CollapsibleTrigger class="bg-momentum py-2 px-4 w-full my-1 rounded-xl flex gap-3 items-center text-xl">
        {open() ? <FaSolidChevronDown /> : <FaSolidChevronRight />}
        Attendee Feedback Approval
      </CollapsibleTrigger>
      <CollapsibleContent class="border rounded-xl p-9 my-2 border-gray-700">
        <div class="flex mb-2">
          <Button
            variant="success"
            disabled={approvingAllSubmission.pending || !unapproveCount()}
            onClick={emitApproveAll}
          >
            Approve All Attendee Feedback
          </Button>

          <div class="grow" />

          <div class="flex flex-col text-center">
            <p>Filter by rating</p>
            <div class="flex">
              <button
                onClick={() => setRatingFilter(filter => (filter === 0 ? undefined : 0))}
                class={clsx(
                  'p-3 text-xl border flex justify-center bg-red-500 bg-opacity-50 rounded m-1',
                  ratingFilter() === 0 ? 'border-white' : 'border-transparent'
                )}
              >
                <BsEmojiFrownFill />
              </button>
              <button
                onClick={() => setRatingFilter(filter => (filter === 1 ? undefined : 1))}
                class={clsx(
                  'p-3 text-xl border flex justify-center bg-yellow-500 bg-opacity-50 rounded m-1',
                  ratingFilter() === 1 ? 'border-white' : 'border-transparent'
                )}
              >
                <BsEmojiNeutralFill />
              </button>
              <button
                onClick={() => setRatingFilter(filter => (filter === 2 ? undefined : 2))}
                class={clsx(
                  'p-3 text-xl border flex justify-center bg-green-500 bg-opacity-50 rounded m-1',
                  ratingFilter() === 2 ? 'border-white' : 'border-transparent'
                )}
              >
                <BsEmojiSmileFill />
              </button>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-4">
          <For each={Object.entries(feedbackSubmissions())}>
            {entry => {
              const session = createMemo(() => getSession(entry[0]));
              const speaker = createMemo(() => getSpeaker(session()?.speakers[0]));

              const filteredSubmissions = () => {
                if (ratingFilter() === undefined) return entry[1];
                return entry[1].filter(x => x.rating === ratingFilter());
              };

              return (
                <Show when={filteredSubmissions().length}>
                  <div class="border-0 border-b p-2 -m-2">
                    <p class="text-lg">
                      {session()?.title} ({speaker()?.fullName})
                    </p>
                    <ul class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
                      <For each={filteredSubmissions()}>
                        {submission => {
                          const approvingSubmission = useSubmission(
                            approveAttendeeFeedbackFn,
                            ([input]) =>
                              submission.userId === input.userId &&
                              submission.sessionId === input.sessionId
                          );
                          const unapprovingSubmission = useSubmission(
                            unapproveAttendeeFeedbackFn,
                            ([input]) =>
                              submission.userId === input.userId &&
                              submission.sessionId === input.sessionId
                          );

                          return (
                            <li class="flex flex-col gap-2 p-2 bg-white bg-opacity-10 text-center">
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
                              <Show
                                when={submission.review}
                                fallback={<em class="opacity-70">No review</em>}
                              >
                                <p>{submission.review}</p>
                              </Show>
                              <div class="grow" />
                              <Show
                                when={submission.approved}
                                fallback={
                                  <Button
                                    class="w-full"
                                    variant="success"
                                    onClick={() => emitApprove(submission)}
                                    disabled={
                                      approvingSubmission.pending || approvingAllSubmission.pending
                                    }
                                  >
                                    Approve
                                  </Button>
                                }
                              >
                                <Button
                                  class="w-full"
                                  variant="destructive"
                                  onClick={() => emitUnapprove(submission)}
                                  disabled={
                                    unapprovingSubmission.pending || approvingAllSubmission.pending
                                  }
                                >
                                  Unapprove
                                </Button>
                              </Show>
                            </li>
                          );
                        }}
                      </For>
                    </ul>
                  </div>
                </Show>
              );
            }}
          </For>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
