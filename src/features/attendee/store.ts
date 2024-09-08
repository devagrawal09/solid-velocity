import { pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const attendeeProfiles = pgTable(`attendee-profiles`, {
  id: uuid(`id`).defaultRandom().primaryKey(),
  userId: text(`userId`).notNull(),
  email: text(`email`).notNull(),
  twitter: text(`twitter`),
  linkedin: text(`linkedin`),
  github: text(`github`)
});
