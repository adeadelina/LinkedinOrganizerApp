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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.googleId, googleId));
    return result[0];
  }

  async createUser(userData: Partial<InsertUser>): Promise<User> {
    // Make sure we have a username
    if (!userData.username) {
      throw new Error("Username is required to create a user");
    }
    
    // Add createdAt date
    const createdAt = new Date();

    // Create the user with the proper shape required by Drizzle
    const result = await db.insert(users).values({
      username: userData.username,
      password: userData.password || null,
      name: userData.name || null,
      email: userData.email || null,
      googleId: userData.googleId || null,
      picture: userData.picture || null,
      createdAt
    }).returning();
    
    return result[0];
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    // First get the existing user
    const existingUser = await this.getUser(id);
    if (!existingUser) return undefined;
    
    // Create an object with only the fields to update
    const updates: Record<string, any> = {};
    
    if (userData.username !== undefined) updates.username = userData.username;
    if (userData.password !== undefined) updates.password = userData.password;
    if (userData.name !== undefined) updates.name = userData.name;
    if (userData.email !== undefined) updates.email = userData.email;
    if (userData.googleId !== undefined) updates.googleId = userData.googleId;
    if (userData.picture !== undefined) updates.picture = userData.picture;
    
    // If there are no updates, just return the existing user
    if (Object.keys(updates).length === 0) {
      return existingUser;
    }
    
    const result = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    
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