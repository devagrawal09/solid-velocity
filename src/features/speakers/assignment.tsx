import { A } from '@solidjs/router';
import { Show } from 'solid-js';
import { Button } from '~/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { useAssignment } from './context';

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
  const { emitUnassign } = useAssignment();
  return (
    <>
      <Button
        onClick={() => emitUnassign(props.sessionId)}
        class="text-sm font-bold"
        variant="destructive"
        size="sm"
      >
        Remove Assignment
      </Button>
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
