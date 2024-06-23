import { createContextProvider } from '@solid-primitives/context';
import { createWritableMemo } from '@solid-primitives/memo';
import { makePersisted } from '@solid-primitives/storage';
import { A, createAsync, useAction } from '@solidjs/router';
import { Show } from 'solid-js';
import { showToast } from '~/components/ui/toast';
import { getSpeakerAssignmentsFn, assignToSessionFn, unassignFromSessionFn } from './s2s-store';
import { Session } from '../sessionize';
import { Button } from '~/components/ui/button';

export function AssignmentComponent(props: { session: Session }) {
  const { isAssigned, toggleAction } = useAssignment();

  return (
    <Show when={isAssigned()} fallback={<Unassigned assignAction={toggleAction} />}>
      <Assigned sessionId={props.session.id} unassignAction={toggleAction} />
    </Show>
  );
}

function Assigned(props: { sessionId: string; unassignAction: () => {} }) {
  return (
    <form
      class="flex flex-col justify-between items-end"
      onSubmit={e => {
        e.preventDefault();
        props.unassignAction();
      }}
    >
      <Button type="submit" class="text-sm font-bold" variant="destructive">
        Remove Assignment
      </Button>
      <A class="text-sm font-bold" href={`/s2s/${props.sessionId}`}>
        <Button class="text-sm font-bold" variant="secondary">
          Submit Feedback
        </Button>
      </A>
    </form>
  );
}

function Unassigned(props: { assignAction: () => {} }) {
  return (
    <form
      class="flex flex-col"
      onSubmit={e => {
        e.preventDefault();
        props.assignAction();
      }}
    >
      <Button type="submit" variant="success" class="text-sm font-bold">
        Assign to me
      </Button>
    </form>
  );
}

export const [AssignmentProvider, useAssignment] = createContextProvider(
  (props: { session: Session }) => {
    const [assignments, setAssignments] = makePersisted(
      createWritableMemo(createAsync(() => getSpeakerAssignmentsFn(), { initialValue: [] })),
      {
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        name: `assignments`
      }
    );

    const isAssigned = () => assignments().includes(props.session.id);

    const assignToSession = useAction(assignToSessionFn);
    const unassignFromSession = useAction(unassignFromSessionFn);

    async function toggleAction() {
      if (isAssigned()) {
        setAssignments(b => b.filter(id => id !== props.session.id));
        const error = await unassignFromSession(props.session.id);

        if (error)
          showToast({
            title: error.message,
            variant: 'error'
          });
        else
          showToast({
            title: `${props.session.title.substring(0, 30)}... removed from Assignments`,
            variant: 'destructive',
            duration: 2000
          });
      } else {
        setAssignments(b => [...b, props.session.id]);
        const error = await assignToSession(props.session.id);

        if (error)
          showToast({
            title: error.message,
            variant: 'error'
          });
        else
          showToast({
            title: `${props.session.title.substring(0, 30)}... added to Assignments`,
            variant: 'success',
            duration: 2000
          });
      }
    }

    return { isAssigned, toggleAction };
  },
  {
    isAssigned: () => {
      throw new Error(`useAssignment was used outside <AssignmentProvider>`);
    },
    toggleAction: () => {
      throw new Error(`useAssignment was used outside <AssignmentProvider>`);
    }
  }
);
