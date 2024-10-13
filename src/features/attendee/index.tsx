import { clerkClient } from '@clerk/clerk-sdk-node';
import { action, cache, createAsync } from '@solidjs/router';
import { clientOnly } from '@solidjs/start';
import { eq } from 'drizzle-orm';
import { FaSolidChevronDown, FaSolidChevronRight } from 'solid-icons/fa';
import { createSignal, Show } from 'solid-js';
import { assertRequestAuth } from '~/auth';
import { Button } from '~/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { TextField, TextFieldInput, TextFieldLabel } from '~/components/ui/text-field';
import { db } from '~/db/drizzle';
import { attendeeProfiles } from './store';

export const getProfileAndConnections = cache(async () => {
  'use server';

  const { userId } = assertRequestAuth();
  let [profile] = await db
    .select()
    .from(attendeeProfiles)
    .where(eq(attendeeProfiles.userId, userId));

  if (!profile) {
    // If there is no profile, that means this is first time user visits Attendee dashboard
    // So we silently create a new profile for them
    const clerkUser = await clerkClient.users.getUser(userId);
    [profile] = await db
      .insert(attendeeProfiles)
      .values([
        {
          userId: userId,
          name: clerkUser.fullName || '',
          avatarUrl: clerkUser.imageUrl || '',
          email: clerkUser.emailAddresses.length > 0 ? clerkUser.emailAddresses[0].emailAddress : ''
        }
      ])
      .returning();
  }

  const connections = await db.query.connectionTable.findMany({
    where: (connection, { eq, or }) =>
      or(eq(connection.from, profile.id), eq(connection.to, profile.id)),
    with: {
      connectionReceiver: true,
      connectionInitiator: true
    }
  });

  return { profile, connections };
}, `profile-and-connections`);

const saveProfileFn = action(async (formData: FormData) => {
  'use server';

  // TODO: update profile data in the database
  console.log(formData);
});

// QrComponnent need to be client-side because it relies on localStorage
const QrCodeComp = clientOnly(() => import('./qrcode'));

export function AttendeeDashboard() {
  const [open, setOpen] = createSignal(false);

  const profileAndConnections = createAsync(() => getProfileAndConnections());

  return (
    <>
      <p class="text-xl my-4">Your Profile</p>
      <Collapsible open={open()} onOpenChange={setOpen}>
        <CollapsibleTrigger class="bg-momentum py-2 px-4 w-full my-1 rounded-xl flex gap-3 items-center text-xl">
          {open() ? <FaSolidChevronDown /> : <FaSolidChevronRight />}
          Show QR Code
        </CollapsibleTrigger>
        <CollapsibleContent class="border rounded-xl p-3 my-2 border-gray-700 justify-center flex">
          <Show when={profileAndConnections()?.profile.id} fallback={<p>Loading QR Code...</p>}>
            <QrCodeComp profileId={profileAndConnections()!.profile.id} />
          </Show>
        </CollapsibleContent>
      </Collapsible>
      <Collapsible open={true}>
        <CollapsibleTrigger class="bg-momentum py-2 px-4 w-full my-1 rounded-xl flex gap-3 items-center text-xl">
          {/* {open() ? <FaSolidChevronDown /> : <FaSolidChevronRight />} */}
          Connections
        </CollapsibleTrigger>
        <CollapsibleContent class="border rounded-xl p-3 my-2 border-gray-700 justify-center flex">
          {/* TODO: show connections in a grid of cards */}
        </CollapsibleContent>
      </Collapsible>

      <form class="my-8 flex flex-col gap-4" action={saveProfileFn}>
        <p>
          This information will be shared with anyone who scans your QR code, including sponsors.
        </p>
        <TextField>
          <TextFieldLabel for="email">Email *</TextFieldLabel>
          <TextFieldInput type="email" id="email" placeholder="Email" required />
        </TextField>
        <TextField>
          <TextFieldLabel for="company">Company</TextFieldLabel>
          <TextFieldInput type="text" id="company" placeholder="Company" />
        </TextField>
        <TextField>
          <TextFieldLabel for="job">Job Title</TextFieldLabel>
          <TextFieldInput type="text" id="job" placeholder="Job Title" />
        </TextField>
        <TextField>
          <TextFieldLabel for="linkedin">LinkedIn</TextFieldLabel>
          <TextFieldInput type="url" id="linkedin" placeholder="LinkedIn" />
        </TextField>
        <TextField>
          <TextFieldLabel for="github">GitHub</TextFieldLabel>
          <TextFieldInput type="url" id="github" placeholder="GitHub" />
        </TextField>
        <TextField>
          <TextFieldLabel for="twitter">Twitter</TextFieldLabel>
          <TextFieldInput type="url" id="twitter" placeholder="Twitter" />
        </TextField>
        <Button type="submit" variant="secondary">
          Save
        </Button>
      </form>
    </>
  );
}
