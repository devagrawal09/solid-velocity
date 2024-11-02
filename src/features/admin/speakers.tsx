import { User, clerkClient } from '@clerk/clerk-sdk-node';
import { action, cache } from '@solidjs/router';
import csvToJson from 'csvtojson';
import { z } from 'zod';
import { getSessionizeData } from '../sessionize/api';
import { db } from '~/db/drizzle';
import { getAllEvents } from '../speakers/store';
import { assertRequestAdmin } from '~/auth';

const uploadSheetSchema = z.array(
  z.object({
    email: z.string().email(),
    speakerId: z.string().min(1),
    name: z.string().optional()
  })
);

export const uploadSpeakerSheet = action(async (csvString: string) => {
  'use server';

  assertRequestAdmin();

  const [jsonString, sessionizeData] = await Promise.all([
    csvToJson().fromString(csvString),
    getSessionizeData()
  ]);
  const parsedSheet = uploadSheetSchema.parse(jsonString);

  const validEntries = parsedSheet.filter(
    entry => !!sessionizeData.speakers.find(s => s.id === entry.speakerId)
  );
  const invalidEntries = parsedSheet.filter(
    entry => !sessionizeData.speakers.find(s => s.id === entry.speakerId)
  );

  console.log(`valid`, validEntries);
  console.log(`invalid`, invalidEntries);

  const users = (
    await Promise.all(
      validEntries.map(async entry => {
        const existingUsers = await clerkClient.users.getUserList({ emailAddress: [entry.email] });

        if (!existingUsers.totalCount) {
          return clerkClient.users.createUser({
            emailAddress: [entry.email],
            publicMetadata: {
              speakerId: entry.speakerId
            }
          });
        }

        const existingUserId = existingUsers.data[0].id;

        return clerkClient.users.updateUserMetadata(existingUserId, {
          publicMetadata: {
            speakerId: entry.speakerId
          }
        });
      })
    )
  ).map(user => user.id);

  return { users, validEntries, invalidEntries };
});

export const getAllS2sEvents = cache(async () => {
  'use server';

  assertRequestAdmin();

  return db.transaction(tx => getAllEvents(tx));
}, `s2s/events`);
