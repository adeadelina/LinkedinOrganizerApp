import { db } from "./database";
import { IStorage } from "./storage";
import { 
  InsertPost,
  Post, 
  categories as defaultCategories,
  posts,
} from "../shared/schema";
import { eq, sql, desc } from "drizzle-orm";

export class DbStorage implements IStorage {
  constructor() {
    // Initialize categories if needed
    this.initializeCategories();
  }

  private async initializeCategories() {
    // This is a no-op for now as categories are just a predefined array
    // In a future implementation, we might want to store categories in a separate table
  }

  async getAllPosts(): Promise<Post[]> {
    try {
      const result = await db.select().from(posts).orderBy(desc(posts.createdAt));
      return result;
    } catch (error) {
      console.error("Error fetching posts:", error);
      throw error;
    }
  }

  async getPostById(id: number): Promise<Post | undefined> {
    const result = await db.select().from(posts).where(eq(posts.id, id));
    return result[0];
  }

  async getPostsByCategory(category: string): Promise<Post[]> {
    // Query posts where the category exists in the categories array
    // This uses PostgreSQL's array contains operator (@>)
    const result = await db.select()
      .from(posts)
      .where(sql`${posts.categories} @> ARRAY[${category}]::text[]`)
      .orderBy(desc(posts.createdAt));

    return result;
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const result = await db.insert(posts).values(insertPost).returning();
    return result[0];
  }

  async updatePost(id: number, postUpdate: Partial<InsertPost>): Promise<Post | undefined> {
    const result = await db
      .update(posts)
      .set(postUpdate)
      .where(eq(posts.id, id))
      .returning();

    return result[0];
  }

  async deletePost(id: number): Promise<boolean> {
    const result = await db
      .delete(posts)
      .where(eq(posts.id, id))
      .returning({ id: posts.id });

    return result.length > 0;
  }

  async getAllCategories(): Promise<string[]> {
    // For now, just return the predefined categories
    // In the future, we could store and retrieve these from a database table
    return defaultCategories;
  }

  async addCategory(category: string): Promise<string[]> {
    // Add the category to the list if it doesn't exist already
    if (!defaultCategories.includes(category)) {
      defaultCategories.push(category);
      console.log(`New category "${category}" added. Updated categories:`, defaultCategories);
    }
    return defaultCategories;
  }

  async deleteCategory(category: string): Promise<string[]> {
    // Find the index of the category
    const index = defaultCategories.indexOf(category);
    if (index !== -1) {
      // Remove the category from the list
      defaultCategories.splice(index, 1);
      console.log(`Category "${category}" deleted. Updated categories:`, defaultCategories);
    } else {
      console.log(`Category "${category}" not found in default categories, but will still be removed from all posts.`);
    }

    // Always update all posts to remove this category
    const allPosts = await this.getAllPosts();
    for (const post of allPosts) {
      if (post.categories && post.categories.includes(category)) {
        // Remove the category from the post
        const updatedCategories = post.categories.filter(c => c !== category);
        await this.updatePost(post.id, { categories: updatedCategories });
        console.log(`Removed category "${category}" from post ${post.id}`);
      }
    }

    return defaultCategories;
  }
}