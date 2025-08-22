
-- This command will remove the redundant foreign key constraint `fk_events_category` from the `events` table.
-- This will resolve the ambiguity that is causing the error when fetching event data.
ALTER TABLE "public"."events" DROP CONSTRAINT "fk_events_category";
