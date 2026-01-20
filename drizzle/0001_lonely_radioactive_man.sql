ALTER TABLE "account" RENAME TO "carely_account";--> statement-breakpoint
ALTER TABLE "session" RENAME TO "carely_session";--> statement-breakpoint
ALTER TABLE "user" RENAME TO "carely_user";--> statement-breakpoint
ALTER TABLE "verification" RENAME TO "carely_verification";--> statement-breakpoint
ALTER TABLE "carely_session" DROP CONSTRAINT "session_token_unique";--> statement-breakpoint
ALTER TABLE "carely_user" DROP CONSTRAINT "user_email_unique";--> statement-breakpoint
ALTER TABLE "carely_account" DROP CONSTRAINT "account_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "carely_post" DROP CONSTRAINT "carely_post_createdById_user_id_fk";
--> statement-breakpoint
ALTER TABLE "carely_session" DROP CONSTRAINT "session_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "carely_account" ADD CONSTRAINT "carely_account_user_id_carely_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."carely_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carely_post" ADD CONSTRAINT "carely_post_createdById_carely_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."carely_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carely_session" ADD CONSTRAINT "carely_session_user_id_carely_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."carely_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carely_session" ADD CONSTRAINT "carely_session_token_unique" UNIQUE("token");--> statement-breakpoint
ALTER TABLE "carely_user" ADD CONSTRAINT "carely_user_email_unique" UNIQUE("email");