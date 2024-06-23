import { createContextProvider } from '@solid-primitives/context';
import { createLatest } from '@solid-primitives/memo';
import { A, createAsyncStore, useAction } from '@solidjs/router';
import { Accessor, Show } from 'solid-js';
import { showToast } from '~/components/ui/toast';
import { getSpeakerAssignmentsFn, assignToSessionFn, unassignFromSessionFn } from './s2s-store';
import { Session } from '../sessionize';
import { Button } from '~/components/ui/button';
import { createEvent, createListener, createSubject, createTopic } from '~/lib/events';

export function AssignmentComponent(props: { session: Session }) {
  const { isAssigned, emitAssign, emitUnassign } = useAssignment();

  return (
    <Show when={isAssigned()} fallback={<Unassigned assignAction={emitAssign} />}>
      <Assigned sessionId={props.session.id} unassignAction={emitUnassign} />
    </Show>
  );
}

function Assigned(props: { sessionId: string; unassignAction: (args: any) => void }) {
  return (
    <div class="flex flex-col justify-between items-end">
      <Button onClick={props.unassignAction} class="text-sm font-bold" variant="destructive">
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

function Unassigned(props: { assignAction: (args: any) => void }) {
  return (
    <div class="flex flex-col">
      <Button onClick={props.assignAction} variant="success" class="text-sm font-bold">
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
    const serverAssignments = createAsyncStore(() => getSpeakerAssignmentsFn(), {
      initialValue: []
    });

    const assignments = createLatest([localAssignments, serverAssignments]) as Accessor<string[]>;

    const isAssigned = () => assignments()?.includes(props.session.id);

    const assignToSession = useAction(assignToSessionFn);
    const unassignFromSession = useAction(unassignFromSessionFn);

    const onAssignResult = onAssign(assignToSession);
    const onUnassignResult = onUnassign(unassignFromSession);

    const onServerResult = createTopic(onAssignResult, onUnassignResult);

    const onServerError = onServerResult(res => {
      return res instanceof Error ? res : null;
    });

    const onServerSuccess = onServerResult(res => {
      return res instanceof Error ? null : res;
    });

    createListener(onServerError, err => {
      showToast({
        title: err.message,
        variant: 'error'
      });
    });

    createListener(onServerSuccess, event => {
      if (event.type === 'session-assigned')
        showToast({
          title: `${props.session.title.substring(0, 30)}... added to Assignments`,
          variant: 'success',
          duration: 2000
        });

      if (event.type === 'session-unassigned')
        showToast({
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
