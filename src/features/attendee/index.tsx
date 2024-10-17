import { clerkClient } from '@clerk/clerk-sdk-node';
import {
  A,
  action,
  cache,
  createAsync,
  useAction,
  useSearchParams,
  useSubmission
} from '@solidjs/router';
import { clientOnly } from '@solidjs/start';
import { eq } from 'drizzle-orm';
import {
  FaBrandsGithub,
  FaBrandsLinkedinIn,
  FaBrandsTwitter,
  FaSolidChevronDown,
  FaSolidChevronRight
} from 'solid-icons/fa';
import { createSignal, For, onMount, Show, Suspense } from 'solid-js';
import { assertRequestAuth } from '~/auth';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { TextField, TextFieldInput, TextFieldLabel } from '~/components/ui/text-field';
import { showToast } from '~/components/ui/toast';
import { db } from '~/db/drizzle';
import { attendeeProfiles } from './store';
import { createEvent } from '~/lib/events';
import { createToastListener } from '~/lib/toast';

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
      name: profileInput.name != undefined ? String(profileInput.name) : undefined,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [showQr, setshowQr] = createSignal(true);
  const [showConnections, setshowConnections] = createSignal(true);
  const [showProfileForm, setShowProfileForm] = createSignal(false);
  const [showExportConnections, setShowExportConnections] = createSignal(false);

  const profileAndConnections = createAsync(() => getProfileAndConnections());
  const profile = () => profileAndConnections()?.profile;
  const connections = () => profileAndConnections()?.connections;

  onMount(async () => {
    const profileId = searchParams.profile;
    const name = (await getProfileAndConnections()).connections.find(c => c.to === profileId)
      ?.connectionReceiver.name;

    if (searchParams.status) {
      switch (searchParams.status) {
        case 'notfound':
          showToast({ description: 'Cannot find this profile', variant: 'error' });
          break;
        case 'success':
          showToast({
            description: (
              <>
                Successfully connected with <strong>{name}</strong>
              </>
            ),
            variant: 'success'
          });
          break;
        case 'alreadyconnected':
          showToast({
            description: (
              <>
                Already connected with <strong>{name}</strong>
              </>
            ),
            variant: 'error'
          });
          break;
      }
    }

    setSearchParams({ status: '', profile: '' });
  });

  const [onSaveProfile, emitSaveProfile] = createEvent<FormData>();
  const saveProfileAction = useAction(saveProfileFn);
  const saveProfileSub = useSubmission(saveProfileFn);
  const onProfileSaved = onSaveProfile(saveProfileAction);
  createToastListener(
    onProfileSaved(() => ({
      title: 'Profile Updated',
      description: 'Your profile has been updated successfully',
      variant: 'success'
    }))
  );

  return (
    <>
      <p class="text-xl my-4">Your Profile</p>
      <Collapsible open={showQr()} onOpenChange={setshowQr}>
        <CollapsibleTrigger class="bg-momentum py-2 px-4 w-full my-1 rounded-xl flex gap-3 items-center text-xl">
          {showQr() ? <FaSolidChevronDown /> : <FaSolidChevronRight />}
          Show QR Code
        </CollapsibleTrigger>
        <CollapsibleContent class="border rounded-xl p-3 my-2 border-gray-700 justify-center flex">
          <QrCodeComp />
        </CollapsibleContent>
      </Collapsible>
      <Collapsible open={showConnections()} onOpenChange={setshowConnections}>
        <CollapsibleTrigger class="bg-momentum py-2 px-4 w-full my-1 rounded-xl flex gap-3 items-center text-xl">
          {showConnections() ? <FaSolidChevronDown /> : <FaSolidChevronRight />}
          Connections
        </CollapsibleTrigger>
        <CollapsibleContent class="border rounded-xl my-2 border-gray-700 p-2">
          <Suspense fallback={<>Loading Your Connections...</>}>
            <Show when={connections()?.length} fallback={<p>No Connections Yet!</p>}>
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-1.5 md:gap-3">
                <For each={connections()!}>
                  {connection => {
                    // Determine if the attendee is the initator or receiver in this connection
                    const profileId = () => profile()!.id;
                    const isInitiator = () => connection.connectionInitiator.id === profileId();
                    const otherProfile = () =>
                      isInitiator()
                        ? connection.connectionReceiver
                        : connection.connectionInitiator;

                    return (
                      <Card>
                        <CardHeader class="p-2.5 md:p-3.5 lg:p-5 !pb-0 text-center">
                          <div class="w-full flex flex-col gap-1 justify-between">
                            <div>
                              <img
                                src={otherProfile().avatarUrl}
                                class="rounded-full w-16 aspect-square m-auto"
                              />
                            </div>
                            <div>
                              <CardTitle>{otherProfile().name}</CardTitle>
                              <CardDescription class="text-sm">
                                {otherProfile().job}
                                {otherProfile().job && <br />}
                                {otherProfile().company}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent class="p-2.5 md:p-3.5 lg:p-5 !pt-0 text-center">
                          <div class="flex flex-col gap-1 text-[0.82rem]">
                            <Show when={otherProfile().email}>
                              {email => <span>{email()}</span>}
                            </Show>
                            <div class="flex justify-between pt-1">
                              <Show when={otherProfile().linkedin}>
                                {linkedIn => (
                                  <a href={linkedIn()} target="_blank">
                                    <FaBrandsLinkedinIn size="20" class="inline" />
                                  </a>
                                )}
                              </Show>
                              <Show when={otherProfile().github}>
                                {github => (
                                  <a href={github()} target="_blank">
                                    <FaBrandsGithub size="20" class="inline" />
                                  </a>
                                )}
                              </Show>
                              <Show when={otherProfile().twitter}>
                                {twitter => (
                                  <a href={twitter()} target="_blank">
                                    <FaBrandsTwitter size="20" class="inline" />
                                  </a>
                                )}
                              </Show>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }}
                </For>
              </div>
            </Show>
          </Suspense>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={showProfileForm()} onOpenChange={setShowProfileForm}>
        <CollapsibleTrigger class="bg-momentum py-2 px-4 w-full my-1 rounded-xl flex gap-3 items-center text-xl">
          {showProfileForm() ? <FaSolidChevronDown /> : <FaSolidChevronRight />}
          Your Profile
        </CollapsibleTrigger>
        <CollapsibleContent class="border rounded-xl my-2 border-gray-700 p-2">
          <form
            class="flex flex-col gap-4"
            method="post"
            onSubmit={e => (e.preventDefault(), emitSaveProfile(new FormData(e.currentTarget)))}
          >
            <p>
              This information will be shared with anyone who scans your QR code, including
              sponsors.
            </p>
            <TextField name="name" defaultValue={profile()?.name ?? undefined} required>
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
              <TextFieldInput type="url" id="linkedin" placeholder="LinkedIn" />
            </TextField>
            <TextField name="github" defaultValue={profile()?.github ?? undefined}>
              <TextFieldLabel for="github">GitHub</TextFieldLabel>
              <TextFieldInput type="url" id="github" placeholder="GitHub" />
            </TextField>
            <TextField name="twitter" defaultValue={profile()?.twitter ?? undefined}>
              <TextFieldLabel for="twitter">Twitter</TextFieldLabel>
              <TextFieldInput type="url" id="twitter" placeholder="Twitter" />
            </TextField>
            <Button type="submit" variant="secondary" disabled={saveProfileSub.pending}>
              Save
            </Button>
          </form>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={showExportConnections()} onOpenChange={setShowExportConnections}>
        <CollapsibleTrigger class="bg-momentum py-2 px-4 w-full my-1 rounded-xl flex gap-3 items-center text-xl">
          {showExportConnections() ? <FaSolidChevronDown /> : <FaSolidChevronRight />}
          Export connections CSV
        </CollapsibleTrigger>
        <CollapsibleContent class="border rounded-xl my-2 border-gray-700 p-2">
          <div class="flex flex-col gap-2">
            <Button as={A} href="connection-export" download="connections-all.csv">
              Download your connections as CSV
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
