import { clerkClient } from "@clerk/clerk-sdk-node";
import { Title } from "@solidjs/meta";
import { cache, createAsync, redirect } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";

const getUser = cache(async() => {
  'use server'
  const event = getRequestEvent()

  const { userId } = event?.locals.auth

  if (!userId) throw redirect('/sign-in');

  const user = await clerkClient.users.getUser(userId)

  return {
    user: JSON.stringify(user, null, 2)
  }
}, 'user')

export default function Me() {
  const user = createAsync(() => getUser())

  return (
    <main>
      <Title>Me</Title>
      <h1>User</h1>
      <div>
        <pre>{user()?.user}</pre>
      </div>
    </main>
  );
}