import { createContextProvider } from '@solid-primitives/context';
import { createLatest } from '@solid-primitives/memo';
import { createAsync, useAction } from '@solidjs/router';
import { Accessor } from 'solid-js';
import { showToast } from '~/components/ui/toast';
import { getSessionizeData } from '~/features/sessionize/api';
import { createEvent, createListener, createSubject, createTopic } from '~/lib/events';
import {
  assignToSessionFn,
  getAllAssignmentsFn,
  getRequestSpeakerFn,
  getSpeakerAssignmentsFn,
  unassignFromSessionFn
} from './api';

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
