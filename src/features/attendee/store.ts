import { relations } from 'drizzle-orm';
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

export const attendeeRelations = relations(attendeeProfiles, ({ many }) => ({
  connectionsSentTo: many(connectionTable),
  connectionsReceevedFrom: many(connectionTable)
}));

export const connectionTable = pgTable(`attendee-connection`, {
  id: uuid(`id`).defaultRandom().primaryKey(),
  from: uuid(`from`)
    .references(() => attendeeProfiles.id)
    .notNull(),
  to: uuid(`to`)
    .references(() => attendeeProfiles.id)
    .notNull()
});

export const connectionsRelations = relations(connectionTable, ({ one }) => ({
  connectionInitiator: one(attendeeProfiles, {
    fields: [connectionTable.from],
    references: [attendeeProfiles.id]
  }),
  connectionReceiver: one(attendeeProfiles, {
    fields: [connectionTable.from],
    references: [attendeeProfiles.id]
  })
}));
