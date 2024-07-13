import { storage } from '~/db';

export type Rating = 0 | 1 | 2;
export type FeedbackEvent =
  | { type: 'rated'; userId: string; sessionId: string; rating: Rating }
  | { type: 'reviewed'; userId: string; sessionId: string; review: string };

async function getFeedbackEvents() {
  return (await storage.getItem<FeedbackEvent[]>('feedback/events')) || [];
}

async function publishFeedbackEvent(events: FeedbackEvent[]) {
  const existingEvents = await getFeedbackEvents();
  storage.setItem('feedback/events', [...existingEvents, ...events]);
  return events;
}

export async function rateSession({
  userId,
  sessionId,
  rating
}: {
  userId: string;
  sessionId: string;
  rating: Rating;
}) {
  return publishFeedbackEvent([{ type: 'rated', userId, sessionId, rating }]);
}

export async function reviewSession({
  userId,
  sessionId,
  review
}: {
  userId: string;
  sessionId: string;
  review: string;
}) {
  return publishFeedbackEvent([{ type: 'reviewed', userId, sessionId, review }]);
}

export async function getSession({ userId, sessionId }: { userId: string; sessionId: string }) {
  const events = await getFeedbackEvents();

  return events.reduce(
    (acc, event) => {
      if (event.type === 'rated' && event.sessionId === sessionId && event.userId === userId) {
        return { ...acc, rating: event.rating };
      }

      if (event.type === 'reviewed' && event.sessionId === sessionId && event.userId === userId) {
        return { ...acc, review: event.review };
      }

      return acc;
    },
    {} as { rating?: Rating; review?: string }
  );
}
