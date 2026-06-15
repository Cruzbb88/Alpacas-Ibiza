ALTER TABLE "bookings" ADD COLUMN "locale" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "review_requested_at" timestamp with time zone;