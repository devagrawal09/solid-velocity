import { createAsync, A } from '@solidjs/router';
import clsx from 'clsx';
import { type ParentProps, createMemo, For, Show } from 'solid-js';
import { getRequestSpeakerFn, getSessionAssigneesFn, getSignedUpSpeakersFn } from './api';
import type { Category, Session } from '../sessionize/store';
import { getSessionizeData } from '../sessionize/api';
import { format } from 'date-fns';

export function MySessionComponent(props: ParentProps<{ session: Session }>) {
  const speakerId = createAsync(() => getRequestSpeakerFn(), { initialValue: '' });
  const data = createAsync(() => getSessionizeData());
  const signedUpSpeakers = createAsync(() => getSignedUpSpeakersFn());
  const assigneeIds = createAsync(() => getSessionAssigneesFn(props.session.id));

  const assignees = createMemo(() =>
    assigneeIds()?.map(assigneeId => data()?.speakers.find(speaker => speaker.id === assigneeId))
  );

  const isSpeakerSignedUp = () => signedUpSpeakers()?.includes(speakerId());

  return (
    <>
      <p class="text-lg my-4">Your Session</p>
      <h2 class="text-sm">
        {format(new Date(props.session.startsAt || ``), 'h:mm a')} to{' '}
        {format(new Date(props.session.endsAt || ``), 'h:mm a')}
      </h2>
      <div class={clsx('border rounded-xl p-3 my-2 border-gray-700')}>
        <div class="flex">
          <div class="grow flex flex-col gap-2">
            <div class="flex gap-2">
              <div class="grow flex flex-col gap-2">
                <A href={`/session/${props.session.id}`}>
                  <h3 class="text-sm hover:underline">{props.session.title}</h3>
                </A>
                <p class="text-xs opacity-90">
                  {data()?.rooms.find(room => room.id === props.session.roomId)?.name}
                </p>
              </div>
            </div>
            <For each={props.session.speakers}>
              {speakerId => {
                const speaker = createMemo(() =>
                  data()?.speakers.find(speaker => speaker.id === speakerId)
                );

                return (
                  <p class="text-xs flex items-center gap-2 px-1 py-1">
                    <img
                      src={speaker()?.profilePicture}
                      alt={speaker()?.fullName}
                      class="rounded-full"
                      width={24}
                      height={24}
                    />
                    {speaker()?.fullName}
                  </p>
                );
              }}
            </For>
            {/* <div class="flex flex-wrap gap-2">
              <For each={data()?.categories}>
                {category => (
                  <For each={categoriesForSession(category, props.session)}>
                    {item => (
                      <span
                        class={clsx(
                          'text-[11px] text-white px-1 py-1 rounded bg-opacity-70',
                          category.title === 'Level' && 'bg-[#145bff]',
                          category.title === 'Tags' && 'bg-[#03969b]'
                        )}
                      >
                        {item.name}
                      </span>
                    )}
                  </For>
                )}
              </For>
            </div> */}
          </div>
          <div class="flex flex-col gap-1 items-end">
            <Show when={isSpeakerSignedUp()}>
              <p class="font-bold">Assigned Reviewers</p>
              <Show
                when={assignees()?.length}
                fallback={<p class="text-sm opacity-75">No reviewers assigned yet</p>}
              >
                <For each={assignees()}>
                  {assignee => (
                    <div class="flex items-center gap-2 px-1 py-1 text-sm">
                      <img
                        src={assignee?.profilePicture}
                        alt={assignee?.fullName}
                        class="rounded-full"
                        width={24}
                        height={24}
                      />
                      {assignee?.fullName}
                    </div>
                  )}
                </For>
              </Show>
            </Show>
          </div>
        </div>
      </div>
    </>
  );
}

function categoriesForSession(
  category: Category,
  session: Session
): { sort: number; id: number; name: string }[] {
  return category.items.filter(item => session.categoryItems.includes(item.id));
}
