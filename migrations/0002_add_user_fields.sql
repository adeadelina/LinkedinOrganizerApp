
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "name" text,
ADD COLUMN IF NOT EXISTS "email" text,
ADD COLUMN IF NOT EXISTS "google_id" text,
ADD COLUMN IF NOT EXISTS "picture" text,
ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();

ALTER TABLE "users"
ADD CONSTRAINT "users_email_unique" UNIQUE("email"),
ADD CONSTRAINT "users_google_id_unique" UNIQUE("google_id");
