import { Title } from '@solidjs/meta';
import { action, cache, redirect, useAction, useSubmission } from '@solidjs/router';
import { assertRequestAuth } from '~/auth';
import { Button } from '~/components/ui/button';
import { storage } from '~/db/kv';
import { uploadSpeakerSheet } from '~/features/admin/speakers';
import { createEvent, createListener } from '~/lib/events';
import { createToastListener } from '~/lib/toast';

const getData = cache(async () => {
  'use server';

  const auth = assertRequestAuth();
  if (auth.sessionClaims.publicMetadata.role !== 'admin') {
    throw redirect('/');
  }

  return Promise.all(
    (await storage.getKeys()).map(async key => {
      const [base, ...parts] = key.split(':');
      const storageKey = parts.join(`:`);
      return { key: storageKey, value: await storage.getItem(storageKey) };
    })
  );
}, 'admin-data');

const removeData = action(async key => {
  'use server';
  console.log(`removing ${key}`);
  const auth = assertRequestAuth();
  if (auth.sessionClaims.publicMetadata.role !== 'admin') {
    throw redirect('/');
  }

  await storage.removeItem(key);
});

export default function Home() {
  return (
    <main class="px-2 sm:px-5">
      <Title>Schedule | Momentum Developer Conference</Title>
      <main class="flex-1 overflow-auto p-6">
        {/* an upload csv file form for speaker sheet to add them into the auth system */}

        <UploadSpeakerSheet />
      </main>
    </main>
  );
}

function UploadSpeakerSheet() {
  const [onSubmit, emitSubmit] = createEvent<FormData>();

  const uploadSpeakerSheetAction = useAction(uploadSpeakerSheet);
  const uploadSubmission = useSubmission(uploadSpeakerSheet);

  const onFileUpload = onSubmit(formData => formData.get('file') as File);
  const onFileRead = onFileUpload(readFileAsync);
  const onUploadResult = onFileRead(uploadSpeakerSheetAction);

  createToastListener(
    onUploadResult(({ users, validEntries, invalidEntries }) => ({
      title: 'Upload Speaker Sheet',
      description: `Uploaded ${validEntries.length} speakers, ${invalidEntries.length} invalid entries, Upserted ${users.length} users`
    }))
  );

  createListener(onUploadResult, console.log);

  return (
    <form
      class="flex flex-col gap-4 max-w-md"
      onSubmit={e => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        emitSubmit(formData);
      }}
    >
      <h2 class="text-xl font-bold">Speaker Sheet Upload</h2>
      <p>
        Register speakers with their email and speaker id to allow them access to the speaker
        dashboard automatically on login.
      </p>
      <div>
        <label class="text-base mb-2 block">Upload CSV file</label>
        <input
          type="file"
          class="w-full text-black font-semibold text-sm bg-white border file:cursor-pointer cursor-pointer file:border-0 file:py-3 file:px-4 file:mr-4 file:bg-gray-100 file:hover:bg-gray-200 file:text-gray-500 rounded"
          name="file"
        />
      </div>
      <Button variant="success" type="submit" disabled={uploadSubmission.pending}>
        Submit
      </Button>
    </form>
  );
}

function readFileAsync(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => reader.result && resolve(reader.result.toString());
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
