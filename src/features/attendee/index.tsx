import { clerkClient } from '@clerk/clerk-sdk-node';
import { action, cache, createAsync } from '@solidjs/router';
import { clientOnly } from '@solidjs/start';
import { eq } from 'drizzle-orm';
import {
  FaSolidChevronDown,
  FaSolidChevronRight,
  FaBrandsLinkedinIn,
  FaBrandsTwitter,
  FaBrandsGithub
} from 'solid-icons/fa';
import { SiMaildotru } from 'solid-icons/si';
import { createSignal, For, Show } from 'solid-js';
import { assertRequestAuth } from '~/auth';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
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
  const { userId } = assertRequestAuth();

  // TODO: update profile data in the database
  const profileInput = Object.fromEntries(formData.entries());

  await db
    .update(attendeeProfiles)
    .set({
      email: profileInput ? String(profileInput) : undefined,
      twitter: profileInput.twitter ? String(profileInput.twitter) : undefined,
      github: profileInput.github ? String(profileInput.github) : undefined,
      linkedin: profileInput.linkedin ? String(profileInput.linkedin) : undefined,
      job: profileInput.job ? String(profileInput.job) : undefined,
      company: profileInput.company ? String(profileInput.company) : undefined
    })
    .where(eq(attendeeProfiles.userId, userId));
});

// QrComponnent need to be client-side because it relies on localStorage
const QrCodeComp = clientOnly(() => import('./qrcode'));

export function AttendeeDashboard() {
  const [showQr, setshowQr] = createSignal(false);
  const [showConnections, setshowConnections] = createSignal(false);

  const profileAndConnections = createAsync(() => getProfileAndConnections());
  const profile = () => profileAndConnections()?.profile;
  const connections = () => profileAndConnections()?.connections;

  return (
    <>
      <p class="text-xl my-4">Your Profile</p>
      <Collapsible open={showQr()} onOpenChange={setshowQr}>
        <CollapsibleTrigger class="bg-momentum py-2 px-4 w-full my-1 rounded-xl flex gap-3 items-center text-xl">
          {showQr() ? <FaSolidChevronDown /> : <FaSolidChevronRight />}
          Show QR Code
        </CollapsibleTrigger>
        <CollapsibleContent class="border rounded-xl p-3 my-2 border-gray-700 justify-center flex">
          <Show when={profile()?.id} fallback={<p>Loading QR Code...</p>}>
            <QrCodeComp profileId={profileAndConnections()!.profile.id} />
          </Show>
        </CollapsibleContent>
      </Collapsible>
      <Collapsible open={true} onOpenChange={setshowConnections}>
        <CollapsibleTrigger class="bg-momentum py-2 px-4 w-full my-1 rounded-xl flex gap-3 items-center text-xl">
          {showConnections() ? <FaSolidChevronDown /> : <FaSolidChevronRight />}
          Connections
        </CollapsibleTrigger>
        <CollapsibleContent class="border rounded-xl my-2 border-gray-700 p-2">
          <Show when={connections()} fallback={<p>Loading Connections...</p>}>
            <div class="grid grid-cols-2 gap-3">
              <For each={connections()!}>
                {connection => {
                  // Determine if the attendee is the initator or receiver in this connection
                  const profileId = profile()!.id;
                  const isInitiator = connection.connectionInitiator.id === profileId;
                  const otherProfile = isInitiator
                    ? connection.connectionReceiver
                    : connection.connectionInitiator;
                  return (
                    <Card>
                      <CardHeader>
                        <div class="w-full flex gap-2 justify-between">
                          <div>
                            <CardTitle>{otherProfile.name}</CardTitle>
                            <CardDescription class="flex flex-col">
                              <p>{otherProfile.job}</p>
                              <p>{otherProfile.company}</p>
                            </CardDescription>
                          </div>
                          <div>
                            <img
                              src={otherProfile.avatarUrl}
                              width={40}
                              height={40}
                              class="rounded-full"
                            />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div class="flex flex-col gap-1">
                          <p>
                            <SiMaildotru class="inline" /> {otherProfile.email}
                          </p>
                          {otherProfile.linkedin && (
                            <p>
                              <FaBrandsLinkedinIn class="inline" /> {otherProfile.linkedin}
                            </p>
                          )}
                          {otherProfile.github && (
                            <p>
                              <FaBrandsGithub class="inline" /> {otherProfile.github}
                            </p>
                          )}
                          {otherProfile.twitter && (
                            <p>
                              <FaBrandsTwitter class="inline" /> {otherProfile.twitter}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                }}
              </For>
            </div>
          </Show>
        </CollapsibleContent>
      </Collapsible>

      <form class="my-8 flex flex-col gap-4" method="post" action={saveProfileFn}>
        <p>
          This information will be shared with anyone who scans your QR code, including sponsors.
        </p>
        <TextField defaultValue={profile()?.email ?? undefined}>
          <TextFieldLabel for="email">Email *</TextFieldLabel>
          <TextFieldInput type="email" id="email" placeholder="Email" required />
        </TextField>
        <TextField defaultValue={profile()?.company ?? undefined}>
          <TextFieldLabel for="company">Company</TextFieldLabel>
          <TextFieldInput type="text" id="company" placeholder="Company" />
        </TextField>
        <TextField defaultValue={profile()?.job ?? undefined}>
          <TextFieldLabel for="job">Job Title</TextFieldLabel>
          <TextFieldInput type="text" id="job" placeholder="Job Title" />
        </TextField>
        <TextField defaultValue={profile()?.linkedin ?? undefined}>
          <TextFieldLabel for="linkedin">LinkedIn</TextFieldLabel>
          <TextFieldInput type="url" id="linkedin" placeholder="LinkedIn" />
        </TextField>
        <TextField defaultValue={profile()?.github ?? undefined}>
          <TextFieldLabel for="github">GitHub</TextFieldLabel>
          <TextFieldInput type="url" id="github" placeholder="GitHub" />
        </TextField>
        <TextField defaultValue={profile()?.twitter ?? undefined}>
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
