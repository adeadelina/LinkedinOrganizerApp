-- Drop existing users table if it exists
DROP TABLE IF EXISTS "users";

-- Create users table with all required fields
CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "google_id" TEXT UNIQUE
);