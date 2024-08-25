DO $$ BEGIN
 CREATE TYPE "public"."bookmark-event-types" AS ENUM('bookmarked', 'unbookmarked');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
