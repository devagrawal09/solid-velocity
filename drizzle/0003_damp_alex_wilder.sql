CREATE TABLE IF NOT EXISTS "speaker-feedback-events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"speakerId" text NOT NULL,
	"feedback" json NOT NULL
);
