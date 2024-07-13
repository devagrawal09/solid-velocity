import type { AuthObject } from '@clerk/backend/dist/types';
import { getRequestEvent } from 'solid-js/web';

export function getRequestAuth() {
  'use server';

  const event = getRequestEvent();

  if (event) return event.locals.auth as AuthObject;
}

export function assertRequestAuth() {
  'use server';

  const event = getRequestEvent();

  if (event) {
    const auth = event.locals.auth as AuthObject;
    if (!auth.userId) throw new Error('Not signed in');
    return auth;
  }

  throw new Error('Invalid request');
}
