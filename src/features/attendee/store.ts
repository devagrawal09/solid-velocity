import { pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const attendeeProfiles = pgTable(`attendee-profiles`, {
  id: uuid(`id`).defaultRandom().primaryKey(),
  userId: text(`userId`).notNull(),
  name: text(`name`).notNull(),
  avatarUrl: text(`avatarUrl`).notNull(),
  email: text(`email`),
  twitter: text(`twitter`),
  linkedin: text(`linkedin`),
  github: text(`github`)
});

export const connectionTable = pgTable(`attendee-connection`, {
  id: uuid(`id`).defaultRandom().primaryKey(),
  from: uuid(`from`)
    .references(() => attendeeProfiles.id)
    .notNull(),
  to: uuid(`to`)
    .references(() => attendeeProfiles.id)
    .notNull()
});
