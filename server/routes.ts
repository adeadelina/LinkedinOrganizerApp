import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { linkedInUrlSchema, insertPostSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { analyzePostContent, extractLinkedInPostInfo } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes - all prefixed with /api
  
  // Get all posts
  app.get("/api/posts", async (req: Request, res: Response) => {
    try {
      const posts = await storage.getAllPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  // Get a single post by ID
  app.get("/api/posts/:id", async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPostById(postId);
      
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch post" });
    }
  });

  // Get posts by category
  app.get("/api/posts/category/:category", async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      const posts = await storage.getPostsByCategory(category);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts by category" });
    }
  });

  // Submit a LinkedIn URL for analysis
  app.post("/api/analyze", async (req: Request, res: Response) => {
    try {
      // Validate URL format
      const validatedData = linkedInUrlSchema.parse(req.body);
      const { url } = validatedData;

      // Create a post with processing status
      const newPost = await storage.createPost({
        url,
        authorName: "",
        authorImage: "",
        content: "",
        publishedDate: null,
        categories: [],
        processingStatus: "processing"
      });

      // Process in the background and respond immediately with the post ID
      // to avoid timeout issues for long-running operations
      res.status(201).json({ 
        message: "Post is being processed", 
        postId: newPost.id,
        post: newPost
      });

      // Now continue processing asynchronously
      processLinkedInPost(newPost.id, url).catch(error => {
        console.error(`Error processing post ${newPost.id}:`, error);
      });
      
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedError = fromZodError(error);
        return res.status(400).json({ error: formattedError.message });
      }
      res.status(500).json({ error: "Failed to process LinkedIn URL" });
    }
  });

  // Get all available categories
  app.get("/api/categories", async (_req: Request, res: Response) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to process a LinkedIn post in the background
async function processLinkedInPost(postId: number, url: string): Promise<void> {
  try {
    // 1. Extract information from the LinkedIn post
    const extractedInfo = await extractLinkedInPostInfo(url);
    
    // Update the post with extracted information
    await storage.updatePost(postId, {
      authorName: extractedInfo.authorName,
      authorImage: extractedInfo.authorImage,
      content: extractedInfo.content,
      publishedDate: extractedInfo.publishedDate
    });

    // 2. Analyze the content and categorize it
    const categories = await storage.getAllCategories();
    const analysis = await analyzePostContent(extractedInfo.content, categories);
    
    // 3. Update the post with categories and set status to completed
    await storage.updatePost(postId, {
      categories: analysis.categories,
      processingStatus: "completed"
    });
    
  } catch (error) {
    console.error(`Error processing post ${postId}:`, error);
    await storage.updatePost(postId, {
      processingStatus: "failed"
    });
  }
}
