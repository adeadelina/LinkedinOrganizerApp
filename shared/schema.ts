import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
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

// Categories for LinkedIn posts
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  bgColor: text("bg_color").notNull(),
  textColor: text("text_color").notNull(),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  bgColor: true,
  textColor: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// LinkedIn posts
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  linkedinUrl: text("linkedin_url").notNull().unique(),
  authorName: text("author_name").notNull(),
  authorImage: text("author_image"),
  authorTitle: text("author_title"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  analyzedAt: timestamp("analyzed_at").defaultNow().notNull(),
  status: text("status").notNull().default("processing"), // processing, analyzed, failed
});

export const insertPostSchema = createInsertSchema(posts).pick({
  linkedinUrl: true,
  authorName: true,
  authorImage: true,
  authorTitle: true,
  content: true,
  status: true,
});

export const updatePostSchema = createInsertSchema(posts).pick({
  authorName: true,
  authorImage: true,
  authorTitle: true,
  content: true,
  status: true,
});

export type InsertPost = z.infer<typeof insertPostSchema>;
export type UpdatePost = z.infer<typeof updatePostSchema>;
export type Post = typeof posts.$inferSelect;

// Post categories (many-to-many)
export const postCategories = pgTable("post_categories", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  categoryId: integer("category_id").notNull(),
});

export const insertPostCategorySchema = createInsertSchema(postCategories).pick({
  postId: true,
  categoryId: true,
});

export type InsertPostCategory = z.infer<typeof insertPostCategorySchema>;
export type PostCategory = typeof postCategories.$inferSelect;

// Schema for validating LinkedIn URL input
export const linkedinUrlSchema = z.object({
  url: z.string().trim().min(1, "LinkedIn URL is required")
    .url("Invalid URL format")
    .includes("linkedin.com", { message: "Must be a LinkedIn URL" }),
});

// Schema for the API response from post analysis
export const postAnalysisResponseSchema = z.object({
  authorName: z.string(),
  authorTitle: z.string().optional(),
  authorImage: z.string().optional(),
  content: z.string(),
  categories: z.array(z.string()).min(1).max(3),
});

export type PostAnalysisResponse = z.infer<typeof postAnalysisResponseSchema>;

// Schema for returning a post with its categories
export const postWithCategoriesSchema = z.object({
  id: z.number(),
  linkedinUrl: z.string(),
  authorName: z.string(),
  authorImage: z.string().nullable(),
  authorTitle: z.string().nullable(),
  content: z.string(),
  createdAt: z.date(),
  analyzedAt: z.date(),
  status: z.string(),
  categories: z.array(z.object({
    id: z.number(),
    name: z.string(),
    bgColor: z.string(),
    textColor: z.string(),
  })),
});

export type PostWithCategories = z.infer<typeof postWithCategoriesSchema>;
