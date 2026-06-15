ALTER TABLE "bookings" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_idempotency_key_unique" ON "bookings" USING btree ("idempotency_key");