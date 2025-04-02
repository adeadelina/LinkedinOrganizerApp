import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AnalyzePostResult {
  categories: string[];
}

/**
 * Analyzes LinkedIn post content and returns appropriate categories
 * @param text LinkedIn post content to analyze
 * @param authorName Name of the post author
 * @returns Object containing suggested categories
 */
export async function analyzePostContent(
  text: string, 
  authorName: string
): Promise<AnalyzePostResult> {
  try {
    const prompt = `
    You are an expert at analyzing LinkedIn content. Review this post by ${authorName} and categorize it:

    POST CONTENT:
    "${text}"

    Analyze the post and assign 2-3 categories from the following predefined options. Be very specific and only use these exact category names:
    - PLG strategy
    - Pricing experiments
    - Onboarding
    - Stakeholder management
    - AI tools for PM
    - Communication
    - Coaching
    - Free trial

    Respond only with a JSON object in the format:
    {
      "categories": ["Category1", "Category2", "Category3"]
    }

    Only include categories that are very relevant to the post content. Choose between 1-3 categories maximum.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const parsedResponse = JSON.parse(content) as AnalyzePostResult;
    
    // Ensure we have at least one category
    if (!parsedResponse.categories || parsedResponse.categories.length === 0) {
      return { categories: ["Communication"] }; // Default fallback
    }

    return parsedResponse;
  } catch (error) {
    console.error("Error analyzing post content:", error);
    throw new Error(`Failed to analyze post content: ${error instanceof Error ? error.message : String(error)}`);
  }
}
