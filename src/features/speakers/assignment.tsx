import { createContextProvider } from '@solid-primitives/context';
import { createLatest } from '@solid-primitives/memo';
import { A, createAsync, useAction } from '@solidjs/router';
import { Accessor, Show } from 'solid-js';
import { showToast } from '~/components/ui/toast';
import { getSpeakerAssignmentsFn, assignToSessionFn, unassignFromSessionFn } from './api';
import { Session } from '../sessionize';
import { Button } from '~/components/ui/button';
import { createEvent, createListener, createSubject, createTopic } from '~/lib/events';

export function AssignmentComponent(props: { session: Session }) {
  const { isAssigned, emitAssign, emitUnassign } = useAssignment();

  return (
    <Show when={isAssigned()} fallback={<Unassigned onAssign={emitAssign} />}>
      <Assigned sessionId={props.session.id} onUnassign={emitUnassign} />
    </Show>
  );
}

function Assigned(props: { sessionId: string; onUnassign: (args: any) => void }) {
  return (
    <div class="flex flex-col justify-between items-end">
      <Button onClick={props.onUnassign} class="text-sm font-bold" variant="destructive">
        Remove Assignment
      </Button>
      <A class="text-sm font-bold" href={`/s2s/${props.sessionId}`}>
        <Button class="text-sm font-bold" variant="secondary">
          Submit Feedback
        </Button>
      </A>
    </div>
  );
}

function Unassigned(props: { onAssign: (args: any) => void }) {
  return (
    <div class="flex flex-col">
      <Button onClick={props.onAssign} variant="success" class="text-sm font-bold">
        Assign to me
      </Button>
    </div>
  );
}

export const [AssignmentProvider, useAssignment] = createContextProvider(
  (props: { session: Session }) => {
    console.log(`AssignmentProvider`);

    const [onAssignClick, emitAssign] = createEvent();
    const [onUnassignClick, emitUnassign] = createEvent();

    const onAssign = onAssignClick(() => props.session.id);
    const onUnassign = onUnassignClick(() => props.session.id);

    const onAssignmentsChange = createTopic<string[]>(
      onAssign(sessionId => [...assignments(), sessionId]),
      onUnassign(sessionId => assignments().filter(id => id !== sessionId))
    );

    const localAssignments = createSubject(onAssignmentsChange, []);
    const serverAssignments = createAsync(() => getSpeakerAssignmentsFn(), {
      initialValue: []
    });

    const assignments = createLatest([localAssignments, serverAssignments]) as Accessor<string[]>;

    const isAssigned = () => assignments()?.includes(props.session.id);

    const assignToSession = useAction(assignToSessionFn);
    const unassignFromSession = useAction(unassignFromSessionFn);

    const onAssignResult = onAssign(assignToSession);
    const onUnassignResult = onUnassign(unassignFromSession);

    const onToggleResult = createTopic(onAssignResult, onUnassignResult);

    createListener(onToggleResult, async result => {
      const events = await result;

      if (events instanceof Error) {
        return showToast({
          title: events.message,
          variant: 'error',
          duration: 2000
        });
      }

      if (events.find(e => e.type === 'session-assigned'))
        return showToast({
          title: `${props.session.title.substring(0, 30)}... added to Assignments`,
          variant: 'success',
          duration: 2000
        });

      if (events.find(e => e.type === 'session-unassigned'))
        return showToast({
          title: `${props.session.title.substring(0, 30)}... removed from Assignments`,
          variant: 'destructive',
          duration: 2000
        });
    });

    return { isAssigned, emitAssign, emitUnassign };
  },
  {
    isAssigned: () => {
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
