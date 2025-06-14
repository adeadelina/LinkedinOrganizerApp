import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  googleId: text("google_id").unique(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password_hash: true,
  name: true,
  email: true,
  googleId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Category definitions
// Base categories provided by default
export let categories = [
  "PLG Strategy",
  "Pricing experiments",
  "Onboarding",
  "Stakeholder management",
  "AI tools for PM",
  "Communication",
  "Coaching",
  "Free trial",
  "Marketing",
  "Sales",
  "Acquisition",
  "SEO",
  "Acquisition plays",
];

// Maximum categories a post can have
export const MAX_CATEGORIES_PER_POST = 10;

// LinkedIn Post schema
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  authorName: text("author_name"),
  authorImage: text("author_image"),
  content: text("content"),
  publishedDate: timestamp("published_date"),
  categories: text("categories").array(),
  summary: text("summary"), // Brief summary of the post content
  confidence: text("confidence"), // Confidence level in categorization (0-1) as string
  processError: text("process_error"), // Error message if processing failed
  processingStatus: text("processing_status").notNull().default("processing"), // 'processing', 'extracting', 'analyzing', 'completed', 'failed'
  postImage: text("post_image"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPostSchema = createInsertSchema(posts).pick({
  url: true,
  authorName: true,
  authorImage: true,
  content: true,
  publishedDate: true,
  categories: true,
  summary: true,
  confidence: true,
  processError: true,
  processingStatus: true,
  postImage: true,
});

export const contentUrlSchema = z.object({
  url: z
    .string()
    .url()
    .refine(
      (url) => {
        return (
          url.startsWith("https://www.linkedin.com/") ||
          url.includes("substack.com/") ||
          url.includes(".substack.com/")
        );
      },
      {
        message: "Must be a valid LinkedIn or Substack URL",
      },
    ),
});

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;
export type ContentUrl = z.infer<typeof contentUrlSchema>;
