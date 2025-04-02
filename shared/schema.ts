import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Category definitions
export const categories = [
  "PLC strategy",
  "Pricing experiments",
  "Onboarding",
  "Stakeholder management",
  "AI tools for PM",
  "Communication",
  "Coaching",
  "Free trial",
];

// LinkedIn Post schema
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  authorName: text("author_name"),
  authorImage: text("author_image"),
  content: text("content"),
  publishedDate: timestamp("published_date"),
  categories: text("categories").array(),
  processingStatus: text("processing_status").notNull().default("processing"), // 'processing', 'completed', 'failed'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPostSchema = createInsertSchema(posts).pick({
  url: true,
  authorName: true,
  authorImage: true,
  content: true,
  publishedDate: true,
  categories: true,
  processingStatus: true,
});

export const linkedInUrlSchema = z.object({
  url: z.string().url().startsWith("https://www.linkedin.com/", {
    message: "Must be a valid LinkedIn URL"
  })
});

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;
export type LinkedInUrl = z.infer<typeof linkedInUrlSchema>;
