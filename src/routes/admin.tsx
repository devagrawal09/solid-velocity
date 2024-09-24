import { Title } from '@solidjs/meta';
import { action, cache, createAsync, redirect, useAction } from '@solidjs/router';
import { createSignal, For } from 'solid-js';
import { assertRequestAuth } from '~/auth';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '~/components/ui/table';
import { storage } from '~/db/kv';

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

  const auth = assertRequestAuth();
  if (auth.sessionClaims.publicMetadata.role !== 'admin') {
    throw redirect('/');
  }

  await storage.removeItem(key);
});

export default function Home() {
  const data = createAsync(() => getData());

  const [showModal, setShowModal] = createSignal(false);
  const [selectedData, setSelectedData] = createSignal<{ key: string; value: any }>();
  const handleViewDetails = (item: { key: string; value: any }) => {
    setSelectedData(item);
    setShowModal(true);
  };
  const removeDataAction = useAction(removeData);
  const handleRemoveEntry = async (key: string) => {
    await removeDataAction(key);
  };

  return (
    <main class="px-2 sm:px-5">
      <Title>Schedule | Momentum Developer Conference</Title>
      <main class="flex-1 overflow-auto p-6">
        <div class="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Value Preview</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={data()}>
                {entry => (
                  <TableRow role="button" onClick={() => handleViewDetails(entry)}>
                    <TableCell class="font-medium">{entry.key}</TableCell>
                    <TableCell>
                      <div class="max-w-[300px] truncate">
                        {JSON.stringify(entry.value, null, 2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e: MouseEvent) => {
                          e.stopPropagation();
                          handleRemoveEntry(entry.key);
                        }}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </div>
      </main>
      <Dialog open={showModal()} onOpenChange={setShowModal}>
        <DialogContent class="h-5/6 text-black flex flex-col max-w-5xl">
          <DialogHeader>
            <DialogTitle>JSON Data</DialogTitle>
            <DialogDescription>
              Viewing the full JSON object for the "{selectedData()?.key}" entry.
            </DialogDescription>
          </DialogHeader>
          <div class="py-4">
            <pre class="bg-muted/20 rounded-lg p-4 text-sm font-mono overflow-scroll max-h-[650px]">
              {JSON.stringify(selectedData()?.value, null, 2)}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
