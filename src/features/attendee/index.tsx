import { action, cache, createAsync } from '@solidjs/router';
import { FaSolidChevronDown, FaSolidChevronRight } from 'solid-icons/fa';
import { createSignal } from 'solid-js';
import { Button } from '~/components/ui/button';
import { CollapsibleTrigger, CollapsibleContent, Collapsible } from '~/components/ui/collapsible';
import { TextFieldLabel, TextFieldInput, TextField } from '~/components/ui/text-field';
import { db } from '~/db/drizzle';
import { attendeeProfiles, connectionTable } from './store';
import { assertRequestAuth } from '~/auth';
import { eq, or } from 'drizzle-orm';

export const connectionsFn = cache(async () => {
  'use server';

  const { userId } = assertRequestAuth();
  const [profile] = await db
    .select()
    .from(attendeeProfiles)
    .where(eq(attendeeProfiles.userId, userId));

  const connections = await db
    .select()
    .from(connectionTable)
    .where(or(eq(connectionTable.from, profile.id), eq(connectionTable.to, profile.id)));
  // TODO: fetch profile data using relations

  return connections;
}, `connections`);

const getQRCode = cache(async () => {
  'use server';

  const { userId } = assertRequestAuth();

  // get profile by user id
  // if profile doesn't exist create it
  // get name and avatar url from Clerk
  // generate qr code using profile id
  // return qr code
}, `qr`);

const saveProfileFn = action(async (formData: FormData) => {
  'use server';

  // TODO: update profile data in the database
  console.log(formData);
});

export function AttendeeDashboard() {
  const [open, setOpen] = createSignal(false);

  const connections = createAsync(() => connectionsFn());
  const qrCode = createAsync(() => getQRCode());
  // TODO: locally cache this

  return (
    <>
      <p class="text-xl my-4">Your Profile</p>
      <Collapsible open={open()} onOpenChange={setOpen}>
        <CollapsibleTrigger class="bg-momentum py-2 px-4 w-full my-1 rounded-xl flex gap-3 items-center text-xl">
          {open() ? <FaSolidChevronDown /> : <FaSolidChevronRight />}
          Show QR Code
        </CollapsibleTrigger>
        <CollapsibleContent class="border rounded-xl p-3 my-2 border-gray-700 justify-center flex">
          <div class="w-[300px] bg-gray-200 h-[300px] rounded text-black text-[70px] justify-center flex items-center">
            QR code
          </div>
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
