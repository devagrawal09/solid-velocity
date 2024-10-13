ALTER TABLE "attendee-profiles" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "attendee-profiles" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "attendee-profiles" ADD COLUMN "avatarUrl" text NOT NULL;