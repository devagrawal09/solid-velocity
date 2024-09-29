import type { AuthObject } from '@clerk/backend';
import { redirect } from '@solidjs/router';
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
    if (!auth?.userId) throw redirect(`/`);
    return auth;
  }

  throw redirect(`/`);
}

export function assertRequestAdmin() {
  'use server';

  const auth = assertRequestAuth();

  if (auth.sessionClaims.publicMetadata.role !== 'admin') throw redirect(`/`);

  return auth;
}
