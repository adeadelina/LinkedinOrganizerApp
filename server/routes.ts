import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { contentUrlSchema, insertPostSchema, MAX_CATEGORIES_PER_POST } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { analyzePostContent, extractLinkedInPostInfo, extractSubstackInfo } from "./openai";

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

  // Get posts by author name
  app.get("/api/posts/author/:author", async (req: Request, res: Response) => {
    try {
      const { author } = req.params;
      const posts = await storage.getPostsByAuthor(author);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts by author" });
    }
  });

  // Submit a LinkedIn or Substack URL for analysis
  app.post("/api/analyze", async (req: Request, res: Response) => {
    try {
      // Validate URL format
      const validatedData = contentUrlSchema.parse(req.body);
      const { url } = validatedData;

      // Clean URL by removing tracking parameters if any (utm_, etc.)
      const cleanUrl = new URL(url);
      // Remove common tracking parameters
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
        cleanUrl.searchParams.delete(param);
      });
      const normalizedUrl = cleanUrl.toString();
      
      // Check if a similar URL already exists in the database by checking base paths
      const allPosts = await storage.getAllPosts();
      
      // Check both the exact URL and normalized version for existing posts
      let existingPost = allPosts.find(post => {
        // Exact match
        if (post.url === url) return true;
        
        // Try to normalize the stored URL for comparison
        try {
          const storedUrl = new URL(post.url);
          // Remove tracking params from stored URL as well
          ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
            storedUrl.searchParams.delete(param);
          });
          
          // Check for path + hostname match (ignoring other parameters)
          return storedUrl.hostname === cleanUrl.hostname && 
                 storedUrl.pathname === cleanUrl.pathname;
        } catch (e) {
          return false;
        }
      });

      if (existingPost) {
        // If URL already exists, return the existing post
        console.log(`URL already exists in database: ${url}`);
        console.log(`Matching post ID: ${existingPost.id}`);
        return res.status(200).json({
          message: "Content already exists",
          postId: existingPost.id,
          post: existingPost,
          exists: true
        });
      }

      // Create a post with processing status if it doesn't exist
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
        message: "Content is being processed", 
        postId: newPost.id,
        post: newPost,
        exists: false
      });

      // Now continue processing asynchronously
      processContentPost(newPost.id, url).catch(error => {
        console.error(`Error processing post ${newPost.id}:`, error);
      });
      
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedError = fromZodError(error);
        return res.status(400).json({ error: formattedError.message });
      }
      res.status(500).json({ error: "Failed to process URL" });
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
  
  // Manually update post categories
  app.post("/api/posts/:id/update-categories", async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPostById(postId);
      
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      // Validate the incoming data
      const { categories, newCategories } = req.body;
      
      if ((!categories || !Array.isArray(categories) || categories.length === 0) && 
          (!newCategories || !Array.isArray(newCategories) || newCategories.length === 0)) {
        return res.status(400).json({ error: "At least one category is required" });
      }
      
      let selectedCategories = [...(categories || [])];
      
      // Process any new categories provided
      if (newCategories && Array.isArray(newCategories) && newCategories.length > 0) {
        // Add each new category to the system
        for (const newCategory of newCategories) {
          if (typeof newCategory === 'string' && newCategory.trim()) {
            // Add to global categories list
            await storage.addCategory(newCategory.trim());
            // Add to the selected categories for this post if not already included
            if (!selectedCategories.includes(newCategory.trim())) {
              selectedCategories.push(newCategory.trim());
            }
          }
        }
      }
      
      // Enforce maximum categories limit
      if (selectedCategories.length > MAX_CATEGORIES_PER_POST) {
        return res.status(400).json({ 
          error: `Maximum of ${MAX_CATEGORIES_PER_POST} categories per post allowed`,
          current: selectedCategories.length
        });
      }
      
      // Update the post with the new categories
      const updatedPost = await storage.updatePost(postId, { categories: selectedCategories });
      
      console.log(`[Post ${postId}] Categories manually updated to: ${selectedCategories.join(', ')}`);
      
      return res.json(updatedPost);
    } catch (error) {
      console.error("Error updating post categories:", error);
      res.status(500).json({ error: "Failed to update post categories" });
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
        authorName: authorName || post.authorName || 'Content Author',
        publishedDate: new Date(), // Use current date if none was extracted
        processingStatus: "analyzing" // Move to analysis phase
      });
      
      // Process the content in the background
      try {
        // Mark post as ready for user categorization without assigning any categories
        await storage.updatePost(postId, {
          summary: "Content manually added. Please assign categories.", 
          confidence: "0", // No confidence level since no categories assigned yet
          processingStatus: "completed",
          processError: null
        });
        
        console.log(`[Post ${postId}] Successfully processed manually entered content and ready for user categorization`);
        
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

// Helper function to process a LinkedIn or Substack post in the background
async function processContentPost(postId: number, url: string): Promise<void> {
  console.log(`Starting to process content from post ${postId} with URL: ${url}`);
  
  try {
    // Update the post initially with more detailed processing status
    await storage.updatePost(postId, {
      processingStatus: "extracting",
      processError: null
    });
    
    // 1. Extract information from the content URL
    console.log(`[Post ${postId}] Extracting information from URL: ${url}`);
    let extractedInfo;
    
    try {
      if (url.includes('substack.com') || url.includes('.substack.com')) {
        // Handle Substack URLs
        extractedInfo = await extractSubstackInfo(url);
      } else {
        // Handle LinkedIn URLs
        extractedInfo = await extractLinkedInPostInfo(url);
      }
      
      if (!extractedInfo.content || extractedInfo.content.trim().length === 0) {
        throw new Error('No content was extracted from the URL');
      }
      
      // Update the post with extracted information
      await storage.updatePost(postId, {
        authorName: extractedInfo.authorName || 'Content Author',
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

    // 2. Mark post as ready for user categorization without assigning any categories
    console.log(`[Post ${postId}] Content extracted successfully, ready for user categorization`);
    try {
      // Set the post as completed but leave categories empty for user to choose
      await storage.updatePost(postId, {
        categories: [], // Leave empty for user to choose
        summary: "Content extracted from LinkedIn post. Please assign categories.", 
        confidence: "0", // No confidence level since no categories assigned yet
        processingStatus: "completed",
        processError: null
      });
      
      console.log(`[Post ${postId}] Successfully extracted and ready for manual categorization`);
    } catch (analysisError: any) {
      console.error(`[Post ${postId}] Error assigning category:`, analysisError);
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
      } else if (error.message.toLowerCase().includes('url')) {
        errorMessage = 'URL error: The URL may be invalid or inaccessible';
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
