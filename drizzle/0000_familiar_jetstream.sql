CREATE TABLE "carely_account" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carely_chat" (
	"id" uuid PRIMARY KEY NOT NULL,
	"publicId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"userId" varchar(255) NOT NULL,
	"createdAt" timestamp NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "carely_chat_publicId_unique" UNIQUE("publicId")
);
--> statement-breakpoint
CREATE TABLE "carely_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"filename" varchar(255) NOT NULL,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carely_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"createdAt" timestamp NOT NULL,
	"content" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carely_post" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256),
	"createdById" varchar(255) NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "carely_session" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" varchar(255) NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" varchar(36) NOT NULL,
	CONSTRAINT "carely_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "carely_user" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"has_completed_intake" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "carely_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "carely_verification" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "carely_visit" (
	"id" uuid PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"createdAt" timestamp NOT NULL,
	"chatId" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "carely_account" ADD CONSTRAINT "carely_account_user_id_carely_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."carely_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carely_chat" ADD CONSTRAINT "carely_chat_userId_carely_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."carely_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carely_document" ADD CONSTRAINT "carely_document_userId_carely_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."carely_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carely_history" ADD CONSTRAINT "carely_history_userId_carely_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."carely_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carely_post" ADD CONSTRAINT "carely_post_createdById_carely_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."carely_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carely_session" ADD CONSTRAINT "carely_session_user_id_carely_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."carely_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carely_visit" ADD CONSTRAINT "carely_visit_userId_carely_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."carely_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carely_visit" ADD CONSTRAINT "carely_visit_chatId_carely_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."carely_chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_user_idx" ON "carely_document" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "created_by_idx" ON "carely_post" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "name_idx" ON "carely_post" USING btree ("name");