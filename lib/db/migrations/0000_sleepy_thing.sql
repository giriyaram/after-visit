CREATE TYPE "public"."staff_role" AS ENUM('doctor', 'reception');--> statement-breakpoint
CREATE TABLE "clinics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow_ups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"patient_phone" text NOT NULL,
	"window_days" smallint NOT NULL,
	"visit_note" text NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"closed_early_at" timestamp with time zone,
	"link_token_hash" text NOT NULL,
	"consented_at" timestamp with time zone,
	"failed_verify_attempts" smallint DEFAULT 0 NOT NULL,
	"verify_locked_until" timestamp with time zone,
	"flagged_for_doctor_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follow_ups_link_token_hash_unique" UNIQUE("link_token_hash"),
	CONSTRAINT "follow_ups_window_days_check" CHECK ("follow_ups"."window_days" in (3, 7, 14)),
	CONSTRAINT "follow_ups_visit_note_check" CHECK (char_length("follow_ups"."visit_note") between 1 and 120),
	CONSTRAINT "follow_ups_ends_at_check" CHECK ("follow_ups"."ends_at" > "follow_ups"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "patient_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follow_up_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "patient_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"role" "staff_role" NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_clinic_id_id_unique" UNIQUE("clinic_id","id")
);
--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_clinic_id_doctor_id_staff_fk" FOREIGN KEY ("clinic_id","doctor_id") REFERENCES "public"."staff"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_sessions" ADD CONSTRAINT "patient_sessions_follow_up_id_follow_ups_id_fk" FOREIGN KEY ("follow_up_id") REFERENCES "public"."follow_ups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "follow_ups_clinic_id_ends_at_index" ON "follow_ups" USING btree ("clinic_id","ends_at");--> statement-breakpoint
CREATE INDEX "staff_clinic_id_role_index" ON "staff" USING btree ("clinic_id","role");