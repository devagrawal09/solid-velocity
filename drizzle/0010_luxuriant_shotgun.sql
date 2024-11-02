CREATE TABLE IF NOT EXISTS "speaker-notifs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"speakerId" text NOT NULL,
	"for" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
