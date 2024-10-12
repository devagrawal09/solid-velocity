CREATE TABLE IF NOT EXISTS "attendee-profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"email" text NOT NULL,
	"twitter" text,
	"linkedin" text,
	"github" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendee-connection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from" uuid NOT NULL,
	"to" uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendee-connection" ADD CONSTRAINT "attendee-connection_from_attendee-profiles_id_fk" FOREIGN KEY ("from") REFERENCES "public"."attendee-profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendee-connection" ADD CONSTRAINT "attendee-connection_to_attendee-profiles_id_fk" FOREIGN KEY ("to") REFERENCES "public"."attendee-profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
