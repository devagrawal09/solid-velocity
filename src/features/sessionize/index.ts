import { z } from 'zod';
import { storage } from '~/db';

const roomSchema = z.object({
  id: z.number(),
  name: z.string(),
  sort: z.number()
});

export type Room = z.infer<typeof roomSchema>;

const sessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startsAt: z.string(),
  endsAt: z.string(),
  speakers: z.array(z.string()),
  categoryItems: z.array(z.number()),
  roomId: z.number()
});

export type Session = z.infer<typeof sessionSchema>;

const speakerSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  bio: z.string(),
  tagLine: z.string(),
  profilePicture: z.string(),
  links: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      linkType: z.enum(['LinkedIn', 'Blog', 'Company_Website', 'Twitter'])
    })
  ),
  sessions: z.array(z.number()),
  fullName: z.string()
});

export type Speaker = z.infer<typeof speakerSchema>;
export type SpeakerLink = Speaker['links'][number];

const categorySchema = z.object({
  id: z.number(),
  title: z.enum(['Level', 'Tags']),
  items: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      sort: z.number()
    })
  ),
  sort: z.number(),
  type: z.enum(['session'])
});

export type Category = z.infer<typeof categorySchema>;

const sessionizeSchema = z.object({
  sessions: z.array(sessionSchema),
  speakers: z.array(speakerSchema),
  categories: z.array(categorySchema),
  rooms: z.array(roomSchema)
});

export type SessionizeData = z.infer<typeof sessionizeSchema>;

export async function getData() {
  const response = await fetch('https://sessionize.com/api/v2/s4ayfppt/view/All');
  const data = await response.json();
  return sessionizeSchema.parse(data);
}

export async function getCachedData() {
  const cachedData = await storage.getItem<SessionizeData>(`sessionize-data`);

  if (!cachedData) {
    const data = await getData();
    await storage.setItem<SessionizeData>(`sessionize-data`, data);
    return data;
  }

  return cachedData;
}
