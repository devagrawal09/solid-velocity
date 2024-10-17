import { z } from 'zod';
import { serverCache } from '~/db/kv';

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
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  speakers: z.array(z.string()),
  categoryItems: z.array(z.number()),
  roomId: z.number().nullable()
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
      linkType: z.enum([
        'LinkedIn',
        'Blog',
        'Company_Website',
        'Twitter',
        'Facebook',
        'Instagram',
        'Other'
      ])
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

export const getCachedData = serverCache(
  async function () {
    const response = await fetch('https://sessionize.com/api/v2/p0ni4alx/view/All');
    const data = await response.json();
    return sessionizeSchema.parse(data);
  },
  `sessionize`,
  86400000 // 24 hours in milliseconds
);
