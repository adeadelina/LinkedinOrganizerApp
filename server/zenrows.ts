import axios from 'axios';

const API_KEY = process.env.ZENROWS_API_KEY;
const ZENROWS_URL = 'https://api.zenrows.com/v1/';

/**
 * Extract content from a LinkedIn post URL using ZenRows API
 * @param url LinkedIn post URL to scrape
 * @returns Extracted data including author name, content, and publication date
 */
export async function scrapeLinkedInPost(url: string): Promise<{
  authorName: string;
  authorImage: string;
  content: string;
  publishedDate: Date;
}> {
  try {
    // Configure the request parameters for ZenRows
    const params = {
      url,
      apikey: API_KEY,
      js_render: 'true',
      premium_proxy: 'true',
      wait_for: '.update-components-text',
      // Specify CSS selectors for targeting specific elements
      custom_css: 'article'
    };

    // Make the request to ZenRows API
    const response = await axios.get(ZENROWS_URL, { params });
    const html = response.data;
    
    // Extract information from the HTML response
    const authorName = extractAuthorName(html) || 'LinkedIn User';
    const authorImage = extractAuthorImage(html) || '';
    const content = extractPostContent(html) || 'No content available';
    const publishedDate = extractPublishedDate(html) || new Date();

    return {
      authorName,
      authorImage,
      content,
      publishedDate
    };
  } catch (error: any) {
    console.error('Error scraping LinkedIn post:', error);
    throw new Error(`Failed to scrape LinkedIn post: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Extract the author's name from HTML
 */
function extractAuthorName(html: string): string | null {
  try {
    // Look for common patterns in LinkedIn post HTML for author name
    const nameRegex = /<span\s+class="[^"]*author-name[^"]*"[^>]*>(.*?)<\/span>/i;
    const match = html.match(nameRegex);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Fallback to more generic pattern if specific class not found
    const altNameRegex = /<a\s+[^>]*href="[^"]*\/in\/[^"]*"[^>]*>(.*?)<\/a>/i;
    const altMatch = html.match(altNameRegex);
    
    return altMatch && altMatch[1] ? altMatch[1].trim() : null;
  } catch (error) {
    console.error('Error extracting author name:', error);
    return null;
  }
}

/**
 * Extract the author's profile image URL from HTML
 */
function extractAuthorImage(html: string): string | null {
  try {
    // Look for common patterns in LinkedIn post HTML for profile images
    const imgRegex = /<img\s+[^>]*class="[^"]*profile-picture[^"]*"[^>]*src="([^"]+)"[^>]*>/i;
    const match = html.match(imgRegex);
    
    if (match && match[1]) {
      return match[1];
    }
    
    // Fallback to more generic pattern
    const altImgRegex = /<img\s+[^>]*src="([^"]+)"[^>]*alt="[^"]*profile[^"]*"[^>]*>/i;
    const altMatch = html.match(altImgRegex);
    
    return altMatch && altMatch[1] ? altMatch[1] : null;
  } catch (error) {
    console.error('Error extracting author image:', error);
    return null;
  }
}

/**
 * Extract the post content from HTML
 */
function extractPostContent(html: string): string | null {
  try {
    // Look for common patterns in LinkedIn post HTML for post content
    // Using dotAll behavior with a workaround for older TS versions
    const contentRegex = new RegExp('<div\\s+[^>]*class="[^"]*update-components-text[^"]*"[^>]*>(.*?)<\\/div>', 'i');
    const match = html.match(contentRegex);
    
    if (match && match[1]) {
      // Clean up HTML tags for plain text
      return match[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim();
    }
    
    // Fallback to more generic pattern
    const altContentRegex = new RegExp('<article[^>]*>(.*?)<\\/article>', 'i');
    const altMatch = html.match(altContentRegex);
    
    if (altMatch && altMatch[1]) {
      return altMatch[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim();
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting post content:', error);
    return null;
  }
}

/**
 * Extract the post publication date from HTML
 */
function extractPublishedDate(html: string): Date | null {
  try {
    // Look for common patterns in LinkedIn post HTML for publication date
    const dateRegex = /<time\s+[^>]*datetime="([^"]+)"[^>]*>/i;
    const match = html.match(dateRegex);
    
    if (match && match[1]) {
      return new Date(match[1]);
    }
    
    // If we can't find a specific date, return the current date
    return new Date();
  } catch (error) {
    console.error('Error extracting published date:', error);
    return null;
  }
}