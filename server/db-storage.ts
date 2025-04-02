import { db } from "./database";
import { IStorage } from "./storage";
import { 
  InsertPost, 
  InsertUser, 
  Post, 
  User, 
  categories as defaultCategories,
  posts,
  users
} from "../shared/schema";
import { eq, sql, desc, asc } from "drizzle-orm";

export class DbStorage implements IStorage {
  constructor() {
    // Initialize categories if needed
    this.initializeCategories();
  }

  private async initializeCategories() {
    // This is a no-op for now as categories are just a predefined array
    // In a future implementation, we might want to store categories in a separate table
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getAllPosts(): Promise<Post[]> {
    return await db.select().from(posts).orderBy(desc(posts.createdAt));
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
    // Since we're using a predefined array for now, this is a no-op
    // In the future, we would insert into a categories table
    return defaultCategories;
  }
}