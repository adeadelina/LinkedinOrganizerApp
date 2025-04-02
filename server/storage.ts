import { categories, type User, type InsertUser, type Post, type InsertPost } from "@shared/schema";

// Storage interface for CRUD operations
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Post operations
  getAllPosts(): Promise<Post[]>;
  getPostById(id: number): Promise<Post | undefined>;
  getPostsByCategory(category: string): Promise<Post[]>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: number, post: Partial<InsertPost>): Promise<Post | undefined>;
  deletePost(id: number): Promise<boolean>;
  
  // Categories operations
  getAllCategories(): Promise<string[]>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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
    return categories;
  }
}

export const storage = new MemStorage();
