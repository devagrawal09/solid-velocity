import type { AuthObject } from '@clerk/backend/dist/types';
import { getRequestEvent } from 'solid-js/web';

export function getRequestAuth() {
  'use server';

  const event = getRequestEvent();

  if (event) return event.locals.auth as AuthObject;
}
