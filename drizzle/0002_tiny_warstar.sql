CREATE TABLE IF NOT EXISTS "attendee-feedback-events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"sessionId" text NOT NULL,
	"feedback" json NOT NULL
);
