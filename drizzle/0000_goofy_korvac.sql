CREATE TABLE IF NOT EXISTS "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_table_field_translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"field_id" integer NOT NULL,
	"language_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_table_fields" (
	"id" serial PRIMARY KEY NOT NULL,
	"data_table_id" integer NOT NULL,
	"key" text NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"options_json" text DEFAULT '[]' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_table_record_values" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_id" integer NOT NULL,
	"field_id" integer,
	"key" text NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_table_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"data_table_id" integer NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_table_translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"data_table_id" integer NOT NULL,
	"language_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_tables" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "languages" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "login_session_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_token" text NOT NULL,
	"user_id" text,
	"user_login" text NOT NULL,
	"ip_address" text DEFAULT '127.0.0.1' NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL,
	"device_name" text DEFAULT 'Desktop' NOT NULL,
	"device_type" text DEFAULT 'desktop' NOT NULL,
	"browser" text DEFAULT 'Unknown' NOT NULL,
	"os" text DEFAULT 'Unknown' NOT NULL,
	"platform" text DEFAULT '',
	"screen_resolution" text DEFAULT '',
	"timezone" text DEFAULT '',
	"language" text DEFAULT '',
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_active_at" timestamp DEFAULT now() NOT NULL,
	"logged_out_at" timestamp,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_type" text NOT NULL,
	"phone_id" integer,
	"trade_in_phone_id" integer,
	"trade_in_model" text,
	"trade_in_imei" text,
	"trade_in_accepted_price" bigint DEFAULT 0 NOT NULL,
	"part_id" integer,
	"item_title" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"customer_name" text DEFAULT 'Chakana mijoz',
	"customer_phone" text DEFAULT '',
	"total_amount" bigint DEFAULT 0 NOT NULL,
	"payable_amount" bigint DEFAULT 0 NOT NULL,
	"cost_amount" bigint DEFAULT 0 NOT NULL,
	"profit_amount" bigint DEFAULT 0 NOT NULL,
	"payment_method" text DEFAULT 'cash' NOT NULL,
	"cash_paid" bigint DEFAULT 0 NOT NULL,
	"card_paid" bigint DEFAULT 0 NOT NULL,
	"credit_amount" bigint DEFAULT 0 NOT NULL,
	"warranty_months" integer DEFAULT 1 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"device_name" text,
	"device_type" text,
	"browser" text,
	"os" text,
	"platform" text,
	"screen_resolution" text,
	"timezone" text,
	"language" text,
	"last_active_at" timestamp DEFAULT now(),
	"is_deleted" boolean DEFAULT false NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "store_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_name" text DEFAULT 'Mobile Fix' NOT NULL,
	"store_phone" text DEFAULT '+998 90 123 45 67' NOT NULL,
	"store_address" text DEFAULT 'Toshkent sh., Malika savdo majmuasi, B-blok' NOT NULL,
	"cbu_rate" integer DEFAULT 12800 NOT NULL,
	"internal_rate" integer DEFAULT 12820 NOT NULL,
	"default_currency" text DEFAULT 'UZS' NOT NULL,
	"telegram_chat_id" text DEFAULT '',
	"daily_report_time" text DEFAULT '21:00' NOT NULL,
	"printer_paper_width" text DEFAULT '58mm' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text DEFAULT '',
	"type" text DEFAULT 'general' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'admin' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "data_table_field_translations" ADD CONSTRAINT "data_table_field_translations_field_id_data_table_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."data_table_fields"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "data_table_field_translations" ADD CONSTRAINT "data_table_field_translations_language_id_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "data_table_fields" ADD CONSTRAINT "data_table_fields_data_table_id_data_tables_id_fk" FOREIGN KEY ("data_table_id") REFERENCES "public"."data_tables"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "data_table_record_values" ADD CONSTRAINT "data_table_record_values_record_id_data_table_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."data_table_records"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "data_table_record_values" ADD CONSTRAINT "data_table_record_values_field_id_data_table_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."data_table_fields"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "data_table_records" ADD CONSTRAINT "data_table_records_data_table_id_data_tables_id_fk" FOREIGN KEY ("data_table_id") REFERENCES "public"."data_tables"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "data_table_translations" ADD CONSTRAINT "data_table_translations_data_table_id_data_tables_id_fk" FOREIGN KEY ("data_table_id") REFERENCES "public"."data_tables"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "data_table_translations" ADD CONSTRAINT "data_table_translations_language_id_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "login_session_devices" ADD CONSTRAINT "login_session_devices_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "data_table_field_translations_active_idx" ON "data_table_field_translations" USING btree ("field_id","language_id") WHERE "data_table_field_translations"."is_deleted" = false;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "data_table_fields_table_key_active_idx" ON "data_table_fields" USING btree ("data_table_id","key") WHERE "data_table_fields"."is_deleted" = false;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "data_table_record_values_record_key_active_idx" ON "data_table_record_values" USING btree ("record_id","key") WHERE "data_table_record_values"."is_deleted" = false;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "data_table_translations_active_idx" ON "data_table_translations" USING btree ("data_table_id","language_id") WHERE "data_table_translations"."is_deleted" = false;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "data_tables_key_active_idx" ON "data_tables" USING btree ("key") WHERE "data_tables"."is_deleted" = false;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "languages_code_active_idx" ON "languages" USING btree ("code") WHERE "languages"."is_deleted" = false;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "login_session_devices_token_active_idx" ON "login_session_devices" USING btree ("session_token") WHERE "login_session_devices"."is_deleted" = false;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "session_token_active_idx" ON "session" USING btree ("token") WHERE "session"."is_deleted" = false;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_email_active_idx" ON "user" USING btree ("email") WHERE "user"."is_deleted" = false;
