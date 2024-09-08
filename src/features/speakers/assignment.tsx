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
  getSpeakerAssignmentsFn,
  unassignFromSessionFn
} from './api';

export function AssignmentComponent(props: { sessionId: string }) {
  const { isAssigned } = useAssignment();

  return (
    <Show when={isAssigned(props.sessionId)} fallback={<Unassigned sessionId={props.sessionId} />}>
      <Assigned sessionId={props.sessionId} />
    </Show>
  );
}

function Assigned(props: { sessionId: string }) {
  // const { emitUnassign } = useAssignment();

  return (
    <div class="flex flex-col justify-around items-end">
      {/* <Button
        onClick={() => emitUnassign(props.sessionId)}
        class="text-sm font-bold"
        variant="destructive"
      >
        Remove Assignment
      </Button> */}
      <Button class="text-sm font-bold" variant="success" disabled>
        Assigned
      </Button>
      <A href={`/s2s/${props.sessionId}`}>
        <Button class="text-sm font-bold" variant="secondary">
          Submit Feedback
        </Button>
      </A>
    </div>
  );
}

function Unassigned(props: { sessionId: string }) {
  const { assignmentDisabled, emitAssign } = useAssignment();

  return (
    <div class="flex flex-col justify-around items-end">
      <Show
        when={assignmentDisabled(props.sessionId)}
        fallback={
          <Button
            onClick={() => emitAssign(props.sessionId)}
            variant="success"
            class="text-sm font-bold"
          >
            Assign to me
          </Button>
        }
      >
        {reason => (
          <Tooltip>
            <TooltipTrigger>
              <Button
                onClick={() => emitAssign(props.sessionId)}
                variant="success"
                class="text-sm font-bold"
                disabled
              >
                Assign to me
              </Button>
            </TooltipTrigger>
            <TooltipContent>{reason()}</TooltipContent>
          </Tooltip>
        )}
      </Show>

      <A href={`/s2s/${props.sessionId}`}>
        <Button class="text-sm font-bold" variant="secondary">
          Submit Feedback
        </Button>
      </A>
    </div>
  );
}

export const [AssignmentProvider, useAssignment] = createContextProvider(
  () => {
    const [onAssign, emitAssign] = createEvent<string>();
    const [onUnassign, emitUnassign] = createEvent<string>();

    const data = createAsync(() => getSessionizeData());
    const allAssignments = createAsync(() => getAllAssignmentsFn(), { initialValue: {} });

    const getSession = (sessionId: string) => data()?.sessions.find(s => s.id === sessionId);

    const onAssignmentsChange = createTopic<string[]>(
      onAssign(sessionId => [...assignments(), sessionId]),
      onUnassign(sessionId => assignments().filter(id => id !== sessionId))
    );

    const localAssignments = createSubject(onAssignmentsChange, []);
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

    const assignmentDisabled = (sessionId: string) => {
      if (assignments().length > 1) return `You cannot assign more than two sessions`;

      const timeSlot = getSession(sessionId)?.startsAt;
      const assignedTimeSlots = assignments().map(id => getSession(id)?.startsAt);
      const timeSlotConflict = assignedTimeSlots.includes(timeSlot);

      if (timeSlotConflict) return `You cannot assign two sessions at the same time slot`;

      const assignees = allAssignments()[sessionId];

      if (assignees?.length > 1) return `Session already has two assignees`;
    };

    createListener(onToggleResult, async result => {
      const events = await result;

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
