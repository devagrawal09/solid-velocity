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
import { BiLogosLinkedin } from 'solid-icons/bi';
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
          avatarUrl: clerkUser.imageUrl || ''
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

  const profileInput = Object.fromEntries(formData);

  await db
    .update(attendeeProfiles)
    .set({
      email: profileInput.email != undefined ? String(profileInput.email) : undefined,
      twitter: profileInput.twitter != undefined ? String(profileInput.twitter) : undefined,
      github: profileInput.github != undefined ? String(profileInput.github) : undefined,
      linkedin: profileInput.linkedin != undefined ? String(profileInput.linkedin) : undefined,
      job: profileInput.job != undefined ? String(profileInput.job) : undefined,
      company: profileInput.company != undefined ? String(profileInput.company) : undefined
    })
    .where(eq(attendeeProfiles.userId, userId));
});

// QrComponnent need to be client-side because it relies on localStorage
const QrCodeComp = clientOnly(() => import('./qrcode'));

export function AttendeeDashboard() {
  const [showQr, setshowQr] = createSignal(true);
  const [showConnections, setshowConnections] = createSignal(true);
  const [showProfileForm, setShowProfileForm] = createSignal(false);

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
      <Collapsible open={showConnections()} onOpenChange={setshowConnections}>
        <CollapsibleTrigger class="bg-momentum py-2 px-4 w-full my-1 rounded-xl flex gap-3 items-center text-xl">
          {showConnections() ? <FaSolidChevronDown /> : <FaSolidChevronRight />}
          Connections
        </CollapsibleTrigger>
        <CollapsibleContent class="border rounded-xl my-2 border-gray-700 p-2">
          <Show when={connections()} fallback={<p>Loading Connections...</p>}>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-1.5 md:gap-3">
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
                      <CardHeader class="p-2.5 md:p-3.5 lg:p-5">
                        <div class="w-full flex gap-1 justify-between">
                          <div>
                            <CardTitle>{otherProfile.name}</CardTitle>
                            <CardDescription class="text-sm">
                              {otherProfile.job}
                              {otherProfile.job && <br />}
                              {otherProfile.company}
                            </CardDescription>
                          </div>
                          <div>
                            <img
                              src={otherProfile.avatarUrl}
                              class="rounded-full w-8 aspect-square"
                            />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent class="p-2.5 md:p-3.5 lg:p-5 !pt-0">
                        <div class="flex flex-col gap-1 text-[0.82rem]">
                          {otherProfile.email && (
                            <p class="inline-flex gap-1 items-center">
                              <SiMaildotru class="inline" />
                              <span>{otherProfile.email}</span>
                            </p>
                          )}
                          {otherProfile.linkedin && (
                            <p class="inline-flex gap-1 items-center">
                              <FaBrandsLinkedinIn class="inline" />
                              <span>{otherProfile.linkedin.split('/').at(-1)}</span>
                            </p>
                          )}
                          {otherProfile.github && (
                            <p class="flex gap-1 items-center">
                              <FaBrandsGithub class="inline" />
                              <span>{otherProfile.github}</span>
                            </p>
                          )}
                          {otherProfile.twitter && (
                            <p class="flex gap-1 items-center">
                              <FaBrandsTwitter class="inline" />
                              <span>{otherProfile.twitter}</span>
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

      <Collapsible open={showProfileForm()} onOpenChange={setShowProfileForm}>
        <CollapsibleTrigger class="bg-momentum py-2 px-4 w-full my-1 rounded-xl flex gap-3 items-center text-xl">
          {showProfileForm() ? <FaSolidChevronDown /> : <FaSolidChevronRight />}
          Your Profile
        </CollapsibleTrigger>
        <CollapsibleContent class="p-2">
          <form class="my-8 flex flex-col gap-4" method="post" action={saveProfileFn}>
            <p>
              This information will be shared with anyone who scans your QR code, including
              sponsors.
            </p>
            <TextField name="name" defaultValue={profile()?.name ?? undefined}>
              <TextFieldLabel for="name">Name *</TextFieldLabel>
              <TextFieldInput type="text" id="name" placeholder="Name" required />
            </TextField>
            <TextField name="email" defaultValue={profile()?.email ?? undefined} required>
              <TextFieldLabel for="email">Email *</TextFieldLabel>
              <TextFieldInput type="email" id="email" placeholder="Email" required />
            </TextField>
            <TextField name="company" defaultValue={profile()?.company ?? undefined}>
              <TextFieldLabel for="company">Company</TextFieldLabel>
              <TextFieldInput type="text" id="company" placeholder="Company" />
            </TextField>
            <TextField name="job" defaultValue={profile()?.job ?? undefined}>
              <TextFieldLabel for="job">Job Title</TextFieldLabel>
              <TextFieldInput type="text" id="job" placeholder="Job Title" />
            </TextField>
            <TextField name="linkedin" defaultValue={profile()?.linkedin ?? undefined}>
              <TextFieldLabel for="linkedin">LinkedIn</TextFieldLabel>
              <TextFieldInput type="text" id="linkedin" placeholder="LinkedIn" />
            </TextField>
            <TextField name="github" defaultValue={profile()?.github ?? undefined}>
              <TextFieldLabel for="github">GitHub</TextFieldLabel>
              <TextFieldInput type="text" id="github" placeholder="GitHub" />
            </TextField>
            <TextField name="twitter" defaultValue={profile()?.twitter ?? undefined}>
              <TextFieldLabel for="twitter">Twitter</TextFieldLabel>
              <TextFieldInput type="text" id="twitter" placeholder="Twitter" />
            </TextField>
            <Button type="submit" variant="secondary">
              Save
            </Button>
          </form>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
