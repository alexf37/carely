CREATE TABLE "carely_chat" (
	"id" uuid PRIMARY KEY NOT NULL,
	"publicId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"userId" varchar(255) NOT NULL,
	"createdAt" timestamp NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "carely_chat_publicId_unique" UNIQUE("publicId")
);
--> statement-breakpoint
CREATE TABLE "carely_visit" (
	"id" uuid PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"createdAt" timestamp NOT NULL,
	"chatId" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "carely_user" ADD COLUMN "has_completed_intake" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "carely_chat" ADD CONSTRAINT "carely_chat_userId_carely_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."carely_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carely_visit" ADD CONSTRAINT "carely_visit_userId_carely_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."carely_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carely_visit" ADD CONSTRAINT "carely_visit_chatId_carely_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."carely_chat"("id") ON DELETE no action ON UPDATE no action;