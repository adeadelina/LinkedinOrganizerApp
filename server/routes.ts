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
  
  // Manually update post content when automatic extraction fails
  app.post("/api/posts/:id/manual-content", async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPostById(postId);
      
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      // Validate the incoming data
      const { content, authorName } = req.body;
      
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: "Valid post content is required" });
      }
      
      // Update the post with the provided content
      await storage.updatePost(postId, {
        content,
        authorName: authorName || post.authorName || 'LinkedIn User',
        publishedDate: new Date(), // Use current date if none was extracted
        processingStatus: "analyzing" // Move to analysis phase
      });
      
      // Process the content for categorization in the background
      try {
        const categories = await storage.getAllCategories();
        const analysis = await analyzePostContent(content, categories);
        
        if (!analysis.categories || analysis.categories.length === 0) {
          throw new Error('No categories were assigned to the post content');
        }
        
        // Update the post with categories and set status to completed
        await storage.updatePost(postId, {
          categories: analysis.categories,
          summary: analysis.summary,
          confidence: analysis.confidence.toString(),
          processingStatus: "completed",
          processError: null
        });
        
        console.log(`[Post ${postId}] Successfully analyzed manually entered content and categorized into: ${analysis.categories.join(', ')}`);
        
        // Return the fully updated post
        const updatedPost = await storage.getPostById(postId);
        return res.json(updatedPost);
      } catch (analysisError: any) {
        console.error(`[Post ${postId}] Analysis error for manual content:`, analysisError);
        // Still keep the manual content but mark analysis as failed
        await storage.updatePost(postId, {
          processingStatus: "failed",
          processError: `Analysis failed: ${analysisError.message || 'Unknown error'}`
        });
        
        // Return the partially updated post
        const updatedPost = await storage.getPostById(postId);
        return res.status(500).json({ 
          error: "Content saved but analysis failed", 
          post: updatedPost 
        });
      }
    } catch (error) {
      console.error("Error updating post manually:", error);
      res.status(500).json({ error: "Failed to update post content" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to process a LinkedIn post in the background
async function processLinkedInPost(postId: number, url: string): Promise<void> {
  console.log(`Starting to process LinkedIn post ${postId} with URL: ${url}`);
  
  try {
    // Update the post initially with more detailed processing status
    await storage.updatePost(postId, {
      processingStatus: "extracting",
      processError: null
    });
    
    // 1. Extract information from the LinkedIn post
    console.log(`[Post ${postId}] Extracting information from LinkedIn URL`);
    let extractedInfo;
    
    try {
      extractedInfo = await extractLinkedInPostInfo(url);
      
      if (!extractedInfo.content || extractedInfo.content.trim().length === 0) {
        throw new Error('No content was extracted from the LinkedIn post');
      }
      
      // Update the post with extracted information
      await storage.updatePost(postId, {
        authorName: extractedInfo.authorName || 'LinkedIn User',
        authorImage: extractedInfo.authorImage || '',
        content: extractedInfo.content,
        publishedDate: extractedInfo.publishedDate || new Date(),
        processingStatus: "analyzing"
      });
      
      console.log(`[Post ${postId}] Successfully extracted content (${extractedInfo.content.length} characters)`);
    } catch (extractError: any) {
      console.error(`[Post ${postId}] Extraction error:`, extractError);
      await storage.updatePost(postId, {
        processingStatus: "failed",
        processError: `Extraction failed: ${extractError.message || 'Unknown error'}`
      });
      return; // Early exit if extraction fails
    }

    // 2. Analyze the content and categorize it
    console.log(`[Post ${postId}] Analyzing and categorizing content`);
    try {
      const categories = await storage.getAllCategories();
      const analysis = await analyzePostContent(extractedInfo.content, categories);
      
      if (!analysis.categories || analysis.categories.length === 0) {
        throw new Error('No categories were assigned to the post content');
      }
      
      // 3. Update the post with categories and set status to completed
      await storage.updatePost(postId, {
        categories: analysis.categories,
        summary: analysis.summary,
        confidence: analysis.confidence.toString(), // Convert number to string
        processingStatus: "completed",
        processError: null
      });
      
      console.log(`[Post ${postId}] Successfully analyzed and categorized into: ${analysis.categories.join(', ')}`);
    } catch (analysisError: any) {
      console.error(`[Post ${postId}] Analysis error:`, analysisError);
      // Still keep the extracted content but mark analysis as failed
      await storage.updatePost(postId, {
        processingStatus: "failed",
        processError: `Analysis failed: ${analysisError.message || 'Unknown error'}`
      });
    }
  } catch (error: any) {
    console.error(`[Post ${postId}] General processing error:`, error);
    
    // Determine the type of error for better user feedback
    let errorMessage = 'Unknown error occurred';
    
    if (error.message) {
      if (error.message.includes('API key')) {
        errorMessage = 'API key error: Please check your API configuration';
      } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        errorMessage = 'Rate limit exceeded: Please try again later';
      } else if (error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('timeout')) {
        errorMessage = 'Network error: Please check your internet connection';
      } else if (error.message.toLowerCase().includes('url') || error.message.toLowerCase().includes('linkedin')) {
        errorMessage = 'URL error: The LinkedIn URL may be invalid or inaccessible';
      } else {
        errorMessage = `Error: ${error.message}`;
      }
    }
    
    await storage.updatePost(postId, {
      processingStatus: "failed",
      processError: errorMessage
    });
  }
}
