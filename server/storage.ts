import { 
  users, type User, type InsertUser,
  categories, type Category, type InsertCategory,
  posts, type Post, type InsertPost, type UpdatePost,
  postCategories, type PostCategory, type InsertPostCategory,
  type PostWithCategories
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Category methods
  getCategories(): Promise<Category[]>;
  getCategoryByName(name: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Post methods
  getPosts(): Promise<Post[]>;
  getPostById(id: number): Promise<Post | undefined>;
  getPostByUrl(url: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: number, post: UpdatePost): Promise<Post | undefined>;
  
  // Post Category methods
  addCategoryToPost(postId: number, categoryId: number): Promise<PostCategory>;
  getPostCategories(postId: number): Promise<Category[]>;
  
  // Combined methods
  getPostsWithCategories(): Promise<PostWithCategories[]>;
  getPostsByCategoryId(categoryId: number): Promise<PostWithCategories[]>;
  getPostWithCategories(postId: number): Promise<PostWithCategories | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private posts: Map<number, Post>;
  private postCategories: Map<number, PostCategory>;
  
  private userCurrentId: number;
  private categoryCurrentId: number;
  private postCurrentId: number;
  private postCategoryCurrentId: number;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.posts = new Map();
    this.postCategories = new Map();
    
    this.userCurrentId = 1;
    this.categoryCurrentId = 1;
    this.postCurrentId = 1;
    this.postCategoryCurrentId = 1;
    
    // Initialize with default categories
    this.initializeDefaultCategories();
  }
  
  private initializeDefaultCategories() {
    const defaultCategories = [
      { name: "PLG strategy", bgColor: "#E9F5FE", textColor: "#0A66C2" },
      { name: "Pricing experiments", bgColor: "#E8F7FF", textColor: "#0F83BC" },
      { name: "Onboarding", bgColor: "#EDFDFF", textColor: "#0D96A5" },
      { name: "Stakeholder management", bgColor: "#FFFAEB", textColor: "#B54D12" },
      { name: "AI tools for PM", bgColor: "#F5F0FF", textColor: "#7828C8" },
      { name: "Communication", bgColor: "#E7F5E7", textColor: "#057642" },
      { name: "Coaching", bgColor: "#FFEFD5", textColor: "#D96C2C" },
      { name: "Free trial", bgColor: "#F0F0FF", textColor: "#5555AA" }
    ];
    
    for (const category of defaultCategories) {
      this.createCategory(category);
    }
  }

  // User methods
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
  
  // Category methods
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }
  
  async getCategoryByName(name: string): Promise<Category | undefined> {
    return Array.from(this.categories.values()).find(
      (category) => category.name.toLowerCase() === name.toLowerCase(),
    );
  }
  
  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.categoryCurrentId++;
    const category: Category = { ...insertCategory, id };
    this.categories.set(id, category);
    return category;
  }
  
  // Post methods
  async getPosts(): Promise<Post[]> {
    return Array.from(this.posts.values());
  }
  
  async getPostById(id: number): Promise<Post | undefined> {
    return this.posts.get(id);
  }
  
  async getPostByUrl(url: string): Promise<Post | undefined> {
    return Array.from(this.posts.values()).find(
      (post) => post.linkedinUrl === url,
    );
  }
  
  async createPost(insertPost: InsertPost): Promise<Post> {
    const id = this.postCurrentId++;
    const post: Post = { 
      ...insertPost, 
      id, 
      createdAt: new Date(),
      analyzedAt: new Date()
    };
    this.posts.set(id, post);
    return post;
  }
  
  async updatePost(id: number, updatePost: UpdatePost): Promise<Post | undefined> {
    const post = await this.getPostById(id);
    if (!post) return undefined;
    
    const updatedPost: Post = { 
      ...post, 
      ...updatePost,
      analyzedAt: new Date()
    };
    
    this.posts.set(id, updatedPost);
    return updatedPost;
  }
  
  // Post Category methods
  async addCategoryToPost(postId: number, categoryId: number): Promise<PostCategory> {
    const id = this.postCategoryCurrentId++;
    const postCategory: PostCategory = { id, postId, categoryId };
    this.postCategories.set(id, postCategory);
    return postCategory;
  }
  
  async getPostCategories(postId: number): Promise<Category[]> {
    const postCategoryEntries = Array.from(this.postCategories.values())
      .filter(pc => pc.postId === postId);
    
    const categories: Category[] = [];
    for (const pc of postCategoryEntries) {
      const category = await this.categories.get(pc.categoryId);
      if (category) categories.push(category);
    }
    
    return categories;
  }
  
  // Combined methods
  async getPostsWithCategories(): Promise<PostWithCategories[]> {
    const allPosts = await this.getPosts();
    const result: PostWithCategories[] = [];
    
    for (const post of allPosts) {
      const categories = await this.getPostCategories(post.id);
      result.push({
        ...post,
        categories,
      });
    }
    
    // Sort by created date, newest first
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getPostsByCategoryId(categoryId: number): Promise<PostWithCategories[]> {
    const relevantPostCategories = Array.from(this.postCategories.values())
      .filter(pc => pc.categoryId === categoryId);
    
    const result: PostWithCategories[] = [];
    
    for (const pc of relevantPostCategories) {
      const post = await this.getPostById(pc.postId);
      if (post) {
        const categories = await this.getPostCategories(post.id);
        result.push({
          ...post,
          categories,
        });
      }
    }
    
    // Sort by created date, newest first
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getPostWithCategories(postId: number): Promise<PostWithCategories | undefined> {
    const post = await this.getPostById(postId);
    if (!post) return undefined;
    
    const categories = await this.getPostCategories(post.id);
    return {
      ...post,
      categories,
    };
  }
}

export const storage = new MemStorage();
