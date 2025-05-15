import { categories, type User, type InsertUser, type Post, type InsertPost } from "@shared/schema";

// Storage interface for CRUD operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: Partial<InsertUser>): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;

  // Post operations
  getAllPosts(): Promise<Post[]>;
  getPostById(id: number): Promise<Post | undefined>;
  getPostsByCategory(category: string): Promise<Post[]>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: number, post: Partial<InsertPost>): Promise<Post | undefined>;
  deletePost(id: number): Promise<boolean>;

  // Categories operations
  getAllCategories(): Promise<string[]>;
  addCategory(category: string): Promise<string[]>;
  deleteCategory(category: string): Promise<string[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private posts: Map<number, Post>;
  private userCurrentId: number;
  private postCurrentId: number;

  constructor() {
    this.users = new Map();
    this.posts = new Map();
    this.userCurrentId = 1;
    this.postCurrentId = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.googleId === googleId,
    );
  }

  async createUser(userData: Partial<InsertUser>): Promise<User> {
    const id = this.userCurrentId++;
    const createdAt = new Date();
    const user: User = {
      id,
      username: userData.username || `user_${id}`,
      passwordHash: userData.passwordHash || null,
      name: userData.name || null,
      email: userData.email || null,
      googleId: userData.googleId || null,
      picture: userData.picture || null,
      createdAt,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser: User = {
      ...user,
      username: userData.username !== undefined ? userData.username : user.username,
      passwordHash: userData.passwordHash !== undefined ? userData.passwordHash : user.passwordHash,
      name: userData.name !== undefined ? userData.name : user.name,
      email: userData.email !== undefined ? userData.email : user.email,
      googleId: userData.googleId !== undefined ? userData.googleId : user.googleId,
      picture: userData.picture !== undefined ? userData.picture : user.picture,
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Post operations
  async getAllPosts(): Promise<Post[]> {
    return Array.from(this.posts.values()).sort((a, b) => {
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  async getPostById(id: number): Promise<Post | undefined> {
    return this.posts.get(id);
  }

  async getPostsByCategory(category: string): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter(post => post.categories?.includes(category))
      .sort((a, b) => {
        if (!a.createdAt && !b.createdAt) return 0;
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const id = this.postCurrentId++;
    const createdAt = new Date();

    // Create a properly typed Post object with defaults for nullable fields
    const post: Post = {
      id,
      url: insertPost.url,
      authorName: insertPost.authorName || null,
      authorImage: insertPost.authorImage || null,
      content: insertPost.content || null,
      postImage: insertPost.postImage || null,
      publishedDate: insertPost.publishedDate || null,
      categories: insertPost.categories || null,
      summary: insertPost.summary || null,
      confidence: insertPost.confidence || null,
      processError: insertPost.processError || null,
      processingStatus: insertPost.processingStatus || "processing",
      createdAt
    };

    this.posts.set(id, post);
    return post;
  }

  async updatePost(id: number, postUpdate: Partial<InsertPost>): Promise<Post | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;

    // Handle each field individually to ensure correct types
    const updatedPost: Post = {
      ...post,
      // Only update fields that are provided in postUpdate
      authorName: postUpdate.authorName !== undefined ? postUpdate.authorName : post.authorName,
      authorImage: postUpdate.authorImage !== undefined ? postUpdate.authorImage : post.authorImage,
      content: postUpdate.content !== undefined ? postUpdate.content : post.content,
      postImage: postUpdate.postImage !== undefined ? postUpdate.postImage : post.postImage,
      publishedDate: postUpdate.publishedDate !== undefined ? postUpdate.publishedDate : post.publishedDate,
      categories: postUpdate.categories !== undefined ? postUpdate.categories : post.categories,
      summary: postUpdate.summary !== undefined ? postUpdate.summary : post.summary,
      confidence: postUpdate.confidence !== undefined ? postUpdate.confidence : post.confidence,
      processError: postUpdate.processError !== undefined ? postUpdate.processError : post.processError,
      processingStatus: postUpdate.processingStatus !== undefined ? postUpdate.processingStatus : post.processingStatus
    };

    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  async deletePost(id: number): Promise<boolean> {
    return this.posts.delete(id);
  }

  // Categories operations
  async getAllCategories(): Promise<string[]> {
    // Get all unique categories from posts
    const postCategories = Array.from(this.posts.values())
      .flatMap(post => post.categories || [])
      .filter((category, index, self) => self.indexOf(category) === index);

    // Combine with predefined categories and remove duplicates
    const allCategories = [...new Set([...categories, ...postCategories])];
    return allCategories.sort();
  }

  async addCategory(category: string): Promise<string[]> {
    // Check if category exists (case-sensitive to maintain exact naming)
    if (!categories.includes(category)) {
      // Add to global categories array
      categories.push(category);
      // Sort categories alphabetically
      categories.sort();
    }
    
    // Return all categories including the new one
    return Promise.resolve([...categories]);
  }

  async deleteCategory(category: string): Promise<string[]> {
    // Find the index of the category (case-sensitive)
    const index = categories.indexOf(category);
    if (index !== -1) {
      // Remove the category
      categories.splice(index, 1);
      console.log(`Category "${category}" deleted. Updated categories:`, categories);
    } else {
      console.log(`Category "${category}" not found in default categories, but will still be removed from all posts.`);
    }

    // Always update all posts to remove this category, even if it wasn't in the official list
    // This handles edge cases like test categories or categories that were removed from the default list
    Array.from(this.posts.values()).forEach(post => {
      if (post.categories && post.categories.includes(category)) {
        post.categories = post.categories.filter((c: string) => c !== category);
        console.log(`Removed category "${category}" from post ${post.id}`);
      }
    });

    return categories;
  }
}

// Import the database storage implementation
import { DbStorage } from "./db-storage";

// Choose which storage implementation to use
// We'll use the database implementation by default
export const storage = process.env.DATABASE_URL 
  ? new DbStorage() 
  : new MemStorage();