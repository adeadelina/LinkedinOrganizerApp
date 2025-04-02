import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// This script runs database migrations

export async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL environment variable");
    return;
  }

  try {
    console.log("Starting database migrations...");
    
    // Create a PostgreSQL client specifically for migrations
    const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });
    const db = drizzle(migrationClient);
    
    // Run the migrations
    await migrate(db, { migrationsFolder: "migrations" });
    
    console.log("Migrations completed successfully");
    
    // Close the connection when done
    await migrationClient.end();
    
    return true;
  } catch (error) {
    console.error("Error running migrations:", error);
    return false;
  }
}