CREATE TABLE IF NOT EXISTS "speaker-stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessionId" text NOT NULL,
	"attendeeCount" text NOT NULL
);
