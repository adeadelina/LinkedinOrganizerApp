import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface CategoryAnalysisResult {
  categories: string[];
  confidence: number;
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
    const prompt = `
      Analyze the following LinkedIn post and categorize it into 2-3 of the most relevant categories from this list:
      ${availableCategories.join(', ')}
      
      LinkedIn Post Content:
      """
      ${content}
      """
      
      Provide your response in JSON format with the following properties:
      - categories: array of 2-3 selected categories that best match the content
      - confidence: number between 0 and 1 indicating confidence in categorization
      - summary: brief 1-2 sentence summary of the post content
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 500
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      categories: result.categories || [],
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      summary: result.summary || "No summary available"
    };
  } catch (error) {
    console.error("Error analyzing post content:", error);
    throw new Error(`Failed to analyze content: ${error.message}`);
  }
}

/**
 * Extracts information from LinkedIn post URL
 * @param url LinkedIn post URL
 * @returns Mock extraction result with placeholder data
 */
export async function extractLinkedInPostInfo(url: string): Promise<{
  authorName: string;
  authorImage: string;
  content: string;
  publishedDate: Date;
}> {
  // In a real implementation, you would use web scraping or the LinkedIn API
  // For this demo, we'll simulate extraction with sample data based on URL hash
  
  try {
    // Since we can't actually scrape LinkedIn (would require auth + against TOS),
    // we'll use OpenAI to generate plausible post content
    const prompt = `
      Given this LinkedIn post URL: ${url}
      Generate plausible LinkedIn post content that you would expect to see.
      The content should be appropriate for business/professional networking.
      
      Provide your response in JSON format with the following properties:
      - authorName: a plausible LinkedIn user's name
      - content: the post content (between 2-5 paragraphs)
      - publishedDate: an ISO date string for a recent date
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", 
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      authorName: result.authorName || "LinkedIn User",
      authorImage: "", // Would be an actual image URL in a real implementation
      content: result.content || "No content available",
      publishedDate: new Date(result.publishedDate || new Date()),
    };
  } catch (error) {
    console.error("Error extracting post info:", error);
    throw new Error(`Failed to extract LinkedIn post info: ${error.message}`);
  }
}
