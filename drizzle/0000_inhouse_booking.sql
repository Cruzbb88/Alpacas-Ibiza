CREATE TYPE "public"."tier" AS ENUM('monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."vendor" AS ENUM('stripe', 'mollie');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"slot_id" text NOT NULL,
	"party_size" integer NOT NULL,
	"guest_name" text,
	"guest_email" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"hold_expires_at" timestamp with time zone,
	"payment_ref" text,
	"amount_eur_minor" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor" "vendor" NOT NULL,
	"vendor_customer_id" text NOT NULL,
	"email" text,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text,
	"subscription_id" text,
	"vendor" "vendor" NOT NULL,
	"event_type" text NOT NULL,
	"payload_json" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"idempotency_key" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"vendor" "vendor" NOT NULL,
	"vendor_subscription_id" text NOT NULL,
	"status" text NOT NULL,
	"tier" "tier" NOT NULL,
	"amount_eur_minor" integer NOT NULL,
	"alpaca_slug" text,
	"gift_recipient_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"canceled_at" timestamp with time zone,
	"last_failure_at" timestamp with time zone,
	"failure_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tour_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"tour_slug" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"duration_min" integer NOT NULL,
	"capacity" integer NOT NULL,
	"booked_count" integer DEFAULT 0 NOT NULL,
	"price_eur_minor" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_tour_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."tour_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_slot_id_idx" ON "bookings" USING btree ("slot_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_payment_ref_unique" ON "bookings" USING btree ("payment_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_vendor_vendor_customer_id_unique" ON "customers" USING btree ("vendor","vendor_customer_id");--> statement-breakpoint
CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_events_idempotency_key_unique" ON "payment_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "payment_events_customer_id_idx" ON "payment_events" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "payment_events_subscription_id_idx" ON "payment_events" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "payment_events_event_type_idx" ON "payment_events" USING btree ("event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_vendor_vendor_subscription_id_unique" ON "subscriptions" USING btree ("vendor","vendor_subscription_id");--> statement-breakpoint
CREATE INDEX "subscriptions_customer_id_idx" ON "subscriptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tour_slots_tour_starts_idx" ON "tour_slots" USING btree ("tour_slug","starts_at");--> statement-breakpoint
CREATE INDEX "tour_slots_status_idx" ON "tour_slots" USING btree ("status");