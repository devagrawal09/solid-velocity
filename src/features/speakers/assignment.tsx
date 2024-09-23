import { createContextProvider } from '@solid-primitives/context';
import { createLatest } from '@solid-primitives/memo';
import { A, createAsync, useAction } from '@solidjs/router';
import { Accessor, Show } from 'solid-js';
import { Button } from '~/components/ui/button';
import { showToast } from '~/components/ui/toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { getSessionizeData } from '~/features/sessionize/api';
import { createEvent, createListener, createSubject, createTopic } from '~/lib/events';
import {
  assignToSessionFn,
  getAllAssignmentsFn,
  getRequestSpeakerFn,
  getSpeakerAssignmentsFn,
  unassignFromSessionFn
} from './api';

export function AssignmentComponent(props: { sessionId: string }) {
  const { isAssigned } = useAssignment();

  return (
    <div class="flex flex-col justify-end items-end min-w-52 gap-2">
      <Show
        when={isAssigned(props.sessionId)}
        fallback={<Unassigned sessionId={props.sessionId} />}
      >
        <Assigned sessionId={props.sessionId} />
      </Show>

      <A href={`/session/${props.sessionId}`}>
        <Button size="sm" class="text-sm font-bold" variant="secondary">
          Submit Feedback
        </Button>
      </A>
    </div>
  );
}

function Assigned(props: { sessionId: string }) {
  // const { emitUnassign } = useAssignment();

  return (
    <>
      {/* <Button
        onClick={() => emitUnassign(props.sessionId)}
        class="text-sm font-bold"
        variant="destructive"
      >
        Remove Assignment
      </Button> */}
      <Button size="sm" class="text-sm font-bold cursor-not-allowed" variant="success" disabled>
        Assigned
      </Button>
    </>
  );
}

function Unassigned(props: { sessionId: string }) {
  const { assignmentDisabled, emitAssign } = useAssignment();

  return (
    <Show
      when={assignmentDisabled(props.sessionId)}
      fallback={
        <Button
          size="sm"
          onClick={() => emitAssign(props.sessionId)}
          variant="success"
          class="text-sm font-bold"
        >
          Assign to me
        </Button>
      }
    >
      {reason => (
        <Tooltip openDelay={100}>
          <TooltipTrigger class="text-sm font-bold h-9 rounded-md px-3 bg-success text-success-foreground opacity-50 cursor-not-allowed">
            {reason()[0]}
          </TooltipTrigger>
          <TooltipContent>{reason()[1]}</TooltipContent>
        </Tooltip>
      )}
    </Show>
  );
}

export const [AssignmentProvider, useAssignment] = createContextProvider(
  () => {
    const [onAssign, emitAssign] = createEvent<string>();
    const [onUnassign, emitUnassign] = createEvent<string>();

    const data = createAsync(() => getSessionizeData());
    const allAssignments = createAsync(() => getAllAssignmentsFn(), { initialValue: {} });

    const speakerId = createAsync(() => getRequestSpeakerFn());
    const mySession = () =>
      data()?.sessions.find(session => session.speakers.includes(speakerId() || ``));

    const getSession = (sessionId: string) => data()?.sessions.find(s => s.id === sessionId);

    const localAssignments = createSubject(
      [],
      onAssign(sessionId => [...assignments(), sessionId]),
      onUnassign(sessionId => assignments().filter(id => id !== sessionId))
    );
    const serverAssignments = createAsync(() => getSpeakerAssignmentsFn(), {
      initialValue: []
    });

    const assignments = createLatest([localAssignments, serverAssignments]) as Accessor<string[]>;

    const isAssigned = (sessionId: string) => assignments()?.includes(sessionId);

    const assignToSession = useAction(assignToSessionFn);
    const unassignFromSession = useAction(unassignFromSessionFn);

    const onAssignResult = onAssign(assignToSession);
    const onUnassignResult = onUnassign(unassignFromSession);

    const onToggleResult = createTopic(onAssignResult, onUnassignResult);

    const assignmentDisabled = (sessionId: string): [string, string] | undefined => {
      if (assignments().length > 1)
        return [`Assignment Limit Reached`, `You cannot assign more than two sessions`];

      const timeSlot = getSession(sessionId)?.startsAt;
      const assignedTimeSlots = assignments().map(id => getSession(id)?.startsAt);
      const timeSlotConflict = assignedTimeSlots.includes(timeSlot);

      if (timeSlotConflict)
        return [`Timeslot Conflict`, `You cannot assign two sessions at the same time slot`];

      const assignees = allAssignments()[sessionId];

      if (assignees?.length > 1)
        return [`Session Limit Reached`, `Session already has two assignees`];

      const myTimeSlot = mySession()?.startsAt;
      const myTimeSlotConflict = timeSlot === myTimeSlot;
      if (myTimeSlotConflict)
        return [`Timeslot Conflict`, `You cannot assign a session at your timeslot`];
    };

    createListener(onToggleResult, async events => {
      if (events instanceof Error) {
        return showToast({
          title: events.message,
          variant: 'error',
          duration: 2000
        });
      }

      events.forEach(e => {
        if (e.feedback.type === 'session-assigned') {
          const session = getSession(e.feedback.sessionId);
          session &&
            showToast({
              title: `${session.title.substring(0, 30)}... assigned to you`,
              variant: 'success',
              duration: 2000
            });
        }

        if (e.feedback.type === 'session-unassigned') {
          const session = getSession(e.feedback.sessionId);
          session &&
            showToast({
              title: `${session.title.substring(0, 30)}... removed from Assignments`,
              variant: 'destructive',
              duration: 2000
            });
        }
      });
    });

    return { isAssigned, assignmentDisabled, emitAssign, emitUnassign };
  },
  {
    isAssigned: () => {
      throw new Error(`useAssignment was used outside <AssignmentProvider>`);
    },
    assignmentDisabled: () => {
      throw new Error(`useAssignment was used outside <AssignmentProvider>`);
    },
    emitAssign: () => {
      throw new Error(`useAssignment was used outside <AssignmentProvider>`);
    },
    emitUnassign: () => {
      throw new Error(`useAssignment was used outside <AssignmentProvider>`);
    }
  }
);
