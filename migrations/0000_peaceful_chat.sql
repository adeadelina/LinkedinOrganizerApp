CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"author_name" text,
	"author_image" text,
	"content" text,
	"published_date" timestamp,
	"categories" text[],
	"summary" text,
	"confidence" text,
	"process_error" text,
	"processing_status" text DEFAULT 'processing' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
