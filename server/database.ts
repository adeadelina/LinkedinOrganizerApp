import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Create a PostgreSQL client with connection pooling
const queryClient = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create a Drizzle instance
export const db = drizzle(queryClient);

import { eq, or } from "drizzle-orm";

// Create a user in the database
export async function createUser({
  username,
  name,
  email,
  password_hash,
  googleId,
  picture,
}: {
  username: string;
  name: string;
  email: string;
  password_hash: string;
  googleId?: string;
  picture?: string;
}) {
  const result = await db
    .insert(schema.users)
    .values({
      username,
      name,
      email,
      password_hash, // store hashed password here
      google_id: googleId,
      picture,
    })
    .returning();
  console.log("createUser received password:", password_hash); // Should be the hash string here
  return result[0];
}

// Find a user by username, email, or Google ID
export async function findUserByUsernameOrEmail(identifier: string) {
  const result = await db
    .select()
    .from(schema.users)
    .where(
      or(
        eq(schema.users.username, identifier),
        eq(schema.users.email, identifier),
        eq(schema.users.google_id, identifier),
      ),
    );

  return result[0] || null;
}
