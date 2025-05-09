import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
let openai: OpenAI;

try {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not found in environment variables. Some features will be limited.');
    // Initialize with a dummy key to allow the application to start
    // This will cause API calls to fail, but the fallback logic will handle it
    openai = new OpenAI({ apiKey: 'dummy-key-for-initialization' });
  } else {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error);
  // Initialize with a dummy key to allow the application to start
  openai = new OpenAI({ apiKey: 'dummy-key-for-initialization' });
}

export interface CategoryAnalysisResult {
  categories: string[];
  confidence: number; // Will be converted to string when storing in database
  summary: string;
}

/**
 * Analyzes LinkedIn post content and categorizes it
 * @param content LinkedIn post content to analyze
 * @param availableCategories List of available categories to choose from
 * @returns Object containing assigned categories, confidence, and summary
 */
export async function analyzePostContent(
  content: string, 
  availableCategories: string[]
): Promise<CategoryAnalysisResult> {
  try {
    // Ensure we have valid content to analyze
    if (!content || content.trim().length < 10) {
      throw new Error('Post content is too short or empty');
    }
    
    // Ensure we have valid categories
    if (!availableCategories || availableCategories.length === 0) {
      throw new Error('No available categories provided for analysis');
    }
    
    // Limit content length for the API call (OpenAI has token limits)
    const truncatedContent = content.length > 8000 
      ? content.substring(0, 8000) + '...' 
      : content;
    
    console.log(`Analyzing content (${truncatedContent.length} chars) with OpenAI...`);
    
    const prompt = `
      Analyze the following LinkedIn post and categorize it into 2-3 of the most relevant categories from this list:
      ${availableCategories.join(', ')}
      
      LinkedIn Post Content:
      """
      ${truncatedContent}
      """
      
      Provide your response in JSON format with the following properties:
      - categories: array of 2-3 selected categories that best match the content
      - confidence: number between 0 and 1 indicating confidence in categorization
      - summary: brief 1-2 sentence summary of the post content
    `;

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not found, using basic categorization');
      // Return basic categorization if no API key available
      return generateBasicCategorization(content, availableCategories);
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 500
      });
      
      if (!response.choices || response.choices.length === 0 || !response.choices[0].message.content) {
        throw new Error('Invalid response from OpenAI API');
      }

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Validate the result structure
      if (!result.categories || !Array.isArray(result.categories)) {
        throw new Error('Invalid categories in API response');
      }
      
      return {
        categories: result.categories.slice(0, 3) || [], // Ensure max 3 categories
        confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
        summary: result.summary || "No summary available"
      };
    } catch (openaiError: any) {
      console.error("OpenAI API error:", openaiError);
      // Fall back to basic categorization
      console.warn('Using fallback categorization method');
      return generateBasicCategorization(content, availableCategories);
    }
  } catch (error: any) {
    console.error("Error analyzing post content:", error);
    throw new Error(`Failed to analyze content: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Generate a basic categorization for content when OpenAI is unavailable
 * Uses keyword matching for simple categorization
 */
function generateBasicCategorization(
  content: string, 
  availableCategories: string[]
): CategoryAnalysisResult {
  const contentLower = content.toLowerCase();
  const categoryMatches = new Map<string, number>();
  
  // Define keywords for each category
  const categoryKeywords: Record<string, string[]> = {
    'PLG Strategy': ['plg', 'product led growth', 'self-serve', 'user adoption', 'acquisition'],
    'Pricing experiments': ['pricing', 'monetize', 'revenue', 'subscription', 'tier', 'freemium'],
    'Onboarding': ['onboard', 'tutorial', 'first-time', 'user experience', 'activation'],
    'Stakeholder management': ['stakeholder', 'leadership', 'management', 'team', 'collaboration'],
    'AI tools for PM': ['ai', 'artificial intelligence', 'machine learning', 'automation', 'product manager'],
    'Communication': ['communicate', 'message', 'clarity', 'articulate', 'presentation'],
    'Coaching': ['coach', 'mentor', 'develop', 'growth', 'career', 'feedback'],
    'Free trial': ['trial', 'free', 'demo', 'test drive', 'try before buy']
  };
  
  // Count keyword occurrences for each category
  availableCategories.forEach(category => {
    const keywords = categoryKeywords[category] || [category.toLowerCase()];
    let count = 0;
    
    keywords.forEach(keyword => {
      // Count occurrences of each keyword
      const regex = new RegExp('\\b' + keyword + '\\b', 'gi');
      const matches = contentLower.match(regex);
      if (matches) {
        count += matches.length;
      }
    });
    
    categoryMatches.set(category, count);
  });
  
  // Convert Map to array and sort by match count
  const categoryArray: [string, number][] = [];
  categoryMatches.forEach((count, category) => {
    categoryArray.push([category, count]);
  });
  
  // Sort by count (descending)
  categoryArray.sort((a, b) => b[1] - a[1]);
  
  // Extract top 3 categories
  const sortedCategories = categoryArray
    .map(entry => entry[0])
    .slice(0, 3);
  
  // Create a simple summary
  const firstSentence = content.split(/[.!?]/).filter(s => s.trim().length > 0)[0] || '';
  const summary = firstSentence.length > 100 
    ? firstSentence.substring(0, 100) + '...' 
    : firstSentence;
  
  return {
    categories: sortedCategories.length > 0 ? sortedCategories : [availableCategories[0]],
    confidence: 0.5, // Medium confidence for keyword-based approach
    summary: summary || 'Post about professional development'
  };
}

/**
 * Extracts information from LinkedIn post URL
 * @param url LinkedIn post URL
 * @returns Extraction result with real data from ZenRows API
 */
export async function extractLinkedInPostInfo(url: string): Promise<{
  authorName: string;
  authorImage: string;
  content: string;
  publishedDate: Date;
  postImage: string;
}> {
  // Input validation
  if (!url || !url.trim()) {
    throw new Error('LinkedIn URL is required');
  }
  
  // Basic URL validation
  if (!url.includes('linkedin.com')) {
    throw new Error('URL must be from LinkedIn (linkedin.com)');
  }
  
  // Check if ZenRows API key is available
  if (!process.env.ZENROWS_API_KEY) {
    throw new Error('ZenRows API key is not configured. Please add it to your environment variables.');
  }
  
  console.log(`Extracting information from LinkedIn URL: ${url}`);
  
  // Import the ZenRows scraper here to avoid circular dependencies
  const { scrapeLinkedInPost } = await import('./zenrows');
  
  try {
    // Use ZenRows API to extract real LinkedIn post data
    const extractedData = await scrapeLinkedInPost(url);
    
    // Validate extracted data
    if (!extractedData.content || extractedData.content.trim().length === 0) {
      throw new Error('No content could be extracted from the LinkedIn post');
    }
    
    console.log(`Successfully extracted LinkedIn post content (${extractedData.content.length} chars)`);
    
    return {
      authorName: extractedData.authorName,
      authorImage: extractedData.authorImage,
      content: extractedData.content,
      publishedDate: extractedData.publishedDate,
      postImage: extractedData.postImage || '',
    };
  } catch (error: any) {
    console.error("Error extracting post info:", error);
    
    // More descriptive error message based on the error details
    if (error.message?.includes('API key') || error.message?.includes('API001')) {
      throw new Error('ZenRows API key is invalid or has expired. Please update your API key.');
    } else if (error.message?.includes('429') || error.message?.includes('Too Many Requests') || error.message?.includes('API002')) {
      throw new Error('Rate limit exceeded for ZenRows API. Please try again later.');
    } else if (error.message?.includes('API003')) {
      throw new Error('Usage limit reached for ZenRows API. Please upgrade your plan or try again later.');
    } else if (error.message?.includes('RESP001') || error.message?.includes('protected') || error.message?.includes('authentication')) {
      throw new Error(
        'The LinkedIn post content is protected or requires authentication. ' +
        'Try a different public post. Based on ZenRows documentation, this error occurs when the content ' +
        'extraction fails, which could be due to: (1) The content is not publicly accessible, ' +
        '(2) LinkedIn requires authentication to view this post, or ' +
        '(3) The post URL format has changed or LinkedIn has updated their site structure.'
      );
    } else if (error.message?.includes('RESP002')) {
      throw new Error('The LinkedIn page took too long to load. The network might be slow or the page is too complex.');
    } else if (error.message?.includes('RESP003')) {
      throw new Error('JavaScript rendering error occurred. LinkedIn might have updated their page structure.');
    } else if (error.message?.includes('400') || error.message?.includes('Bad Request') || error.message?.includes('URL')) {
      throw new Error('The LinkedIn URL format is invalid or not supported. Please check the URL structure.');
    } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
      throw new Error('Access to this LinkedIn content is restricted or requires authentication.');
    } else if (error.message?.includes('500') || error.message?.includes('Internal Server')) {
      throw new Error('ZenRows service is experiencing issues. Please try again later.');
    } else if (error.message?.includes('content')) {
      throw new Error('Could not extract content from the LinkedIn post. The post might be private or contain unsupported content.');
    } else if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
      throw new Error('The request to ZenRows API timed out. The network might be slow or the service is busy.');
    } else if (error.message?.includes('ECONNREFUSED') || error.message?.includes('connect')) {
      throw new Error('Could not connect to ZenRows API. The service might be down or blocked by network settings.');
    }
    
    // If no specific error is identified, use the original error message
    throw new Error(`Failed to extract LinkedIn post info: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Extracts information from Substack newsletter URL
 * @param url Substack newsletter URL
 * @returns Extraction result with content for analysis
 */
/**
 * Re-extracts only the author information from a LinkedIn post URL
 * Used to fix posts where author information was not properly extracted initially
 * @param url LinkedIn post URL
 * @returns Promise with author name and image
 */
export async function reExtractLinkedInAuthor(url: string): Promise<{
  authorName: string;
  authorImage: string;
}> {
  if (!url || !url.includes('linkedin.com')) {
    throw new Error('Valid LinkedIn URL is required');
  }
  
  console.log(`Re-extracting author info from LinkedIn URL: ${url}`);
  
  // Import the ZenRows scraper
  const { scrapeLinkedInPost } = await import('./zenrows');
  
  try {
    // Use ZenRows API to extract data with focus on author information
    const extractedData = await scrapeLinkedInPost(url);
    
    // Return just the author information
    return {
      authorName: extractedData.authorName,
      authorImage: extractedData.authorImage,
    };
  } catch (error: any) {
    console.error("Error re-extracting author info:", error);
    throw new Error(`Failed to extract author information: ${error.message}`);
  }
}

export async function extractSubstackInfo(url: string): Promise<{
  authorName: string;
  authorImage: string;
  content: string;
  publishedDate: Date;
  postImage: string;
}> {
  // Input validation
  if (!url || !url.trim()) {
    throw new Error('Substack URL is required');
  }
  
  // Basic URL validation
  if (!url.includes('substack.com') && !url.includes('.substack.com')) {
    throw new Error('URL must be from Substack');
  }

  console.log(`Extracting information from Substack URL: ${url}`);
  
  try {
    // For Substack, we'll use OpenAI to extract relevant content from the URL directly
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured. Please add it to your environment variables.');
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a helpful assistant that extracts and summarizes content from Substack newsletters."
        },
        { 
          role: "user", 
          content: `Please visit this Substack newsletter URL: ${url} and extract the following information:
          1. The title of the newsletter
          2. The author's name
          3. The main content of the newsletter
          4. When it was published (if available)
          
          Format your response as JSON with the following fields:
          - authorName
          - title
          - content (include the full main content)
          - publishedDate (in ISO format if available, otherwise null)`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 4000
    });
    
    if (!response.choices || response.choices.length === 0 || !response.choices[0].message.content) {
      throw new Error('Invalid response from OpenAI API');
    }
    
    const result = JSON.parse(response.choices[0].message.content);
    
    // Validate and construct the result
    const title = result.title || 'Substack Newsletter';
    const content = result.content || '';
    
    // Add title to the content for better context
    const fullContent = `${title}\n\n${content}`;
    
    // Use current date if no published date is available
    let publishedDate: Date;
    try {
      publishedDate = result.publishedDate ? new Date(result.publishedDate) : new Date();
    } catch (e) {
      publishedDate = new Date();
    }
    
    console.log(`Successfully extracted Substack content (${fullContent.length} chars)`);
    
    return {
      authorName: result.authorName || 'Substack Author',
      authorImage: '', // No image extraction for Substack
      content: fullContent,
      publishedDate: publishedDate,
      postImage: '' // No image extraction for Substack
    };
  } catch (error: any) {
    console.error("Error extracting Substack info:", error);
    
    // More descriptive error messages based on the error type
    if (error.message?.includes('API key')) {
      throw new Error('OpenAI API key is invalid or missing. Please check your API configuration.');
    } else if (error.message?.includes('rate limit') || error.message?.includes('429')) {
      throw new Error('Rate limit exceeded for OpenAI API. Please try again later.');
    } else if (error.message?.includes('quota') || error.message?.includes('billing')) {
      throw new Error('OpenAI API quota exceeded. Please check your billing information.');
    }
    
    // If no specific error is identified, use the original error message
    throw new Error(`Failed to extract Substack info: ${error.message || 'Unknown error'}`);
  }
}