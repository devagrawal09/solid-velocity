CREATE TABLE IF NOT EXISTS "bookmark-events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "bookmark-event-types" NOT NULL,
	"userId" text NOT NULL,
	"sessionId" text NOT NULL
);
