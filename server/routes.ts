import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from 'zod-validation-error';
import { linkedinUrlSchema, postAnalysisResponseSchema } from "@shared/schema";
import { extractLinkedInPost } from "./lib/linkedin";
import { analyzePostContent } from "./lib/openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // Get all categories
  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Get all posts with their categories
  app.get("/api/posts", async (_req, res) => {
    try {
      const posts = await storage.getPostsWithCategories();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  // Get posts by category ID
  app.get("/api/posts/category/:categoryId", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      
      const posts = await storage.getPostsByCategoryId(categoryId);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts by category:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  // Get a specific post by ID
  app.get("/api/posts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }
      
      const post = await storage.getPostWithCategories(id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      res.json(post);
    } catch (error) {
      console.error("Error fetching post:", error);
      res.status(500).json({ message: "Failed to fetch post" });
    }
  });

  // Extract and analyze a LinkedIn post
  app.post("/api/analyze", async (req, res) => {
    try {
      // Validate the LinkedIn URL
      const { url } = linkedinUrlSchema.parse(req.body);
      
      // Check if we've already analyzed this URL
      const existingPost = await storage.getPostByUrl(url);
      if (existingPost) {
        const postWithCategories = await storage.getPostWithCategories(existingPost.id);
        return res.json(postWithCategories);
      }
      
      // Create a new post entry with processing status
      const newPost = await storage.createPost({
        linkedinUrl: url,
        authorName: "LinkedIn User",
        content: "Processing...",
        status: "processing"
      });
      
      // Start the analysis process asynchronously
      analyzeLinkedInPost(url, newPost.id)
        .catch(error => console.error("Error during async post analysis:", error));
      
      // Return the post immediately with processing status
      const postWithCategories = await storage.getPostWithCategories(newPost.id);
      res.json(postWithCategories);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error("Error analyzing LinkedIn post:", error);
      res.status(500).json({ 
        message: `Failed to analyze LinkedIn post: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

/**
 * Process a LinkedIn post by extracting content and analyzing with AI
 */
async function analyzeLinkedInPost(url: string, postId: number): Promise<void> {
  try {
    // Extract post data from LinkedIn
    const extractedData = await extractLinkedInPost(url);
    
    // Update the post with extracted data
    await storage.updatePost(postId, {
      authorName: extractedData.authorName,
      authorTitle: extractedData.authorTitle || null,
      authorImage: extractedData.authorImage || null,
      content: extractedData.content,
      status: "processing" // Still processing, need to analyze
    });
    
    // Analyze the content using OpenAI
    const analysisResult = await analyzePostContent(
      extractedData.content, 
      extractedData.authorName
    );
    
    // Update the post status to analyzed
    await storage.updatePost(postId, {
      status: "analyzed"
    });
    
    // Add categories to the post
    for (const categoryName of analysisResult.categories) {
      const category = await storage.getCategoryByName(categoryName);
      if (category) {
        await storage.addCategoryToPost(postId, category.id);
      }
    }
  } catch (error) {
    console.error("Error analyzing LinkedIn post:", error);
    
    // Update the post to indicate failure
    await storage.updatePost(postId, {
      status: "failed"
    });
  }
}
