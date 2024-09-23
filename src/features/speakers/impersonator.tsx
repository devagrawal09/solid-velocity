import { clerkClient } from '@clerk/clerk-sdk-node';
import { action, createAsync, revalidate, useAction } from '@solidjs/router';
import { assertRequestAuth } from '~/auth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select';
import { getSessionizeData } from '~/features/sessionize/api';
import { Speaker } from '../sessionize/store';
import { Show } from 'solid-js';
import { useClerk } from 'clerk-solidjs';
import { adminMode } from '../admin';

const impersonateSpeaker = action(async (speakerId: string) => {
  'use server';

  const auth = assertRequestAuth();
  if (auth.sessionClaims.publicMetadata.role !== 'admin') throw new Error('Unauthorized');

  await clerkClient.users.updateUserMetadata(auth.userId, { publicMetadata: { speakerId } });
});

export function SpeakerImpersonator() {
  const sessionizeData = createAsync(() => getSessionizeData());
  const impersonateSpeakerAction = useAction(impersonateSpeaker);
  const clerk = useClerk();

  const isAdmin = () => clerk()?.user?.publicMetadata.role === 'admin';

  const selectedSpeaker = () =>
    sessionizeData()?.speakers.find(s => clerk()?.user?.publicMetadata.speakerId === s.id);

  return (
    <Show when={isAdmin() && adminMode()}>
      <div class="border border-red-800 p-2 rounded text-red-200">
        Currently Impersonating
        <Select
          value={selectedSpeaker()}
          onChange={async v => {
            if (!v) return;
            if (v.id === selectedSpeaker()?.id) return;
            await impersonateSpeakerAction(v.id);
            await clerk()?.session?.reload();
            window.location.reload();
          }}
          options={sessionizeData()?.speakers || []}
          optionValue="id"
          optionTextValue="fullName"
          placeholder="Impersonate Speaker"
          itemComponent={props => (
            <SelectItem item={props.item}>{props.item.rawValue.fullName}</SelectItem>
          )}
        >
          <SelectTrigger class="w-[180px]">
            <SelectValue<Speaker>>{state => state.selectedOption().fullName}</SelectValue>
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    </Show>
  );
}
