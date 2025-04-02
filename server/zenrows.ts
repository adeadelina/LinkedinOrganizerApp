import axios from 'axios';

const API_KEY = process.env.ZENROWS_API_KEY;
const ZENROWS_URL = 'https://api.zenrows.com/v1/';

/**
 * Transform LinkedIn URLs to a more scrapable format
 * @param url Original LinkedIn URL
 * @returns Transformed URL for better scraping
 */
function transformLinkedInUrl(url: string): string {
  // Process feed URLs to a more stable format
  if (url.includes('/feed/update/')) {
    // Extract the activity ID
    const activityMatch = url.match(/urn:li:activity:(\d+)/);
    if (activityMatch && activityMatch[1]) {
      const activityId = activityMatch[1];
      // Use the post URL format which is more stable for scraping
      return `https://www.linkedin.com/posts/${activityId}`;
    }
  }
  
  // Remove tracking parameters and query strings
  if (url.includes('?')) {
    url = url.split('?')[0];
  }
  
  return url;
}

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
    // Transform the URL to a more scraper-friendly format
    const transformedUrl = transformLinkedInUrl(url);
    console.log(`Scraping LinkedIn post from transformed URL: ${transformedUrl}`);
    
    // Configure the request parameters for ZenRows
    const params = {
      url: transformedUrl,
      apikey: API_KEY,
      js_render: 'true',
      premium_proxy: 'true',
      wait_for: '5000' // Wait 5 seconds for JS rendering to complete
    };

    // Make the request to ZenRows API
    console.log('Sending request to ZenRows API...');
    const response = await axios.get(ZENROWS_URL, { params });
    
    // Check if we got a valid response
    if (!response.data) {
      throw new Error('No data returned from ZenRows API');
    }
    
    const html = response.data;
    console.log(`Received HTML response of length: ${html.length}`);
    
    // For debugging purposes in development, save a sample of the HTML
    if (process.env.NODE_ENV !== 'production') {
      const sampleHtml = html.substring(0, 500) + '... [truncated]';
      console.log('Sample HTML:', sampleHtml);
    }
    
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
    
    // Extract the error response if it exists
    const zenRowsError = error?.response?.data;
    
    if (zenRowsError) {
      const errorCode = zenRowsError.code;
      const errorTitle = zenRowsError.title;
      const errorStatus = zenRowsError.status;
      
      // Create a more descriptive error message based on ZenRows error code
      // Reference: https://docs.zenrows.com/api-error-codes
      if (errorCode === 'RESP001') {
        throw new Error(`Failed to scrape LinkedIn post: Content extraction failed (code: ${errorCode}). This post might be protected or require authentication.`);
      } else if (errorCode === 'RESP002') {
        throw new Error(`Failed to scrape LinkedIn post: Request timed out (code: ${errorCode}). LinkedIn page took too long to load.`);
      } else if (errorCode === 'RESP003') {
        throw new Error(`Failed to scrape LinkedIn post: JS rendering error (code: ${errorCode}). Try disabling JavaScript rendering.`);
      } else if (errorCode === 'API001') {
        throw new Error(`Failed to scrape LinkedIn post: Invalid API key (code: ${errorCode}). Please update your ZenRows API key.`);
      } else if (errorCode === 'API002') {
        throw new Error(`Failed to scrape LinkedIn post: Rate limit exceeded (code: ${errorCode}). Please try again later.`);
      } else if (errorCode === 'API003') {
        throw new Error(`Failed to scrape LinkedIn post: Usage limit reached (code: ${errorCode}). Please upgrade your ZenRows plan.`);
      } else {
        throw new Error(`Failed to scrape LinkedIn post: ${errorTitle || 'Unknown error'} (code: ${errorCode}, status: ${errorStatus})`);
      }
    }
    
    // If we can't extract the ZenRows error, use the generic error message
    throw new Error(`Failed to scrape LinkedIn post: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Extract the author's name from HTML
 */
function extractAuthorName(html: string): string | null {
  try {
    // Try different patterns for LinkedIn author names
    
    // First attempt - common actor name pattern
    const actorRegex = /<span[^>]*class="[^"]*actor-name[^"]*"[^>]*>([\s\S]*?)<\/span>/i;
    let match = html.match(actorRegex);
    
    if (match && match[1]) {
      return match[1].replace(/<[^>]+>/g, '').trim();
    }
    
    // Second attempt - profile links
    const profileRegex = /<a[^>]*href="[^"]*\/in\/[^"]*"[^>]*>([\s\S]*?)<\/a>/i;
    match = html.match(profileRegex);
    
    if (match && match[1]) {
      return match[1].replace(/<[^>]+>/g, '').trim();
    }
    
    // Third attempt - name in title
    const titleRegex = /<title[^>]*>([\s\S]*?)\s+on\s+LinkedIn:[\s\S]*?<\/title>/i;
    match = html.match(titleRegex);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Fourth attempt - author span
    const authorRegex = /<span[^>]*>([\s\S]*?)<\/span>/gi;
    let authorFound = null;
    let m;
    
    while (!authorFound && (m = authorRegex.exec(html)) !== null) {
      if (m[1] && m[1].length > 0 && m[1].length < 40) { // Likely a name (not too long)
        const cleaned = m[1].replace(/<[^>]+>/g, '').trim();
        if (cleaned && cleaned.length > 2 && cleaned.includes(' ')) { // Probably a full name
          authorFound = cleaned;
        }
      }
    }
    
    if (authorFound) {
      return authorFound;
    }
    
    return 'LinkedIn User';
  } catch (error) {
    console.error('Error extracting author name:', error);
    return 'LinkedIn User';
  }
}

/**
 * Extract the author's profile image URL from HTML
 */
function extractAuthorImage(html: string): string | null {
  try {
    // Multiple patterns to extract LinkedIn profile images
    
    // First attempt - profile images with class
    const profileRegex = /<img[^>]*class="[^"]*profile[^"]*"[^>]*src="([^"]+)"[^>]*>/i;
    let match = html.match(profileRegex);
    
    if (match && match[1]) {
      return match[1];
    }
    
    // Second attempt - avatar images
    const avatarRegex = /<img[^>]*class="[^"]*avatar[^"]*"[^>]*src="([^"]+)"[^>]*>/i;
    match = html.match(avatarRegex);
    
    if (match && match[1]) {
      return match[1];
    }
    
    // Third attempt - images with person in alt text
    const altRegex = /<img[^>]*alt="[^"]*photo[^"]*"[^>]*src="([^"]+)"[^>]*>/i;
    match = html.match(altRegex);
    
    if (match && match[1]) {
      return match[1];
    }
    
    // Fourth attempt - any small image that might be a profile pic
    const imageRegex = /<img[^>]*src="([^"]+)"[^>]*>/gi;
    let m;
    let potentialProfileImage = null;
    
    while (!potentialProfileImage && (m = imageRegex.exec(html)) !== null) {
      if (m[1] && 
          (m[1].includes('profile') || m[1].includes('avatar') || m[1].includes('user'))) {
        potentialProfileImage = m[1];
      }
    }
    
    if (potentialProfileImage) {
      return potentialProfileImage;
    }
    
    return '';
  } catch (error) {
    console.error('Error extracting author image:', error);
    return '';
  }
}

/**
 * Extract the post content from HTML
 */
function extractPostContent(html: string): string | null {
  try {
    // For LinkedIn feed posts
    // First attempt with common LinkedIn post content pattern
    const feedRegex = /<div[^>]*class="[^"]*feed-shared-update-v2__description[^"]*"[^>]*>([\s\S]*?)<\/div>/i;
    let match = html.match(feedRegex);
    
    if (match && match[1]) {
      return match[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim();
    }
    
    // Second attempt with more general content pattern
    const contentRegex = /<div[^>]*class="[^"]*break-words[^"]*"[^>]*>([\s\S]*?)<\/div>/i;
    match = html.match(contentRegex);
    
    if (match && match[1]) {
      return match[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim();
    }
    
    // For articles or post bodies
    const bodyRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    const paragraphs = [];
    let m;
    
    while ((m = bodyRegex.exec(html)) !== null) {
      if (m[1]) {
        paragraphs.push(m[1].replace(/<[^>]+>/g, '').trim());
      }
    }
    
    if (paragraphs.length > 0) {
      return paragraphs.join('\n\n');
    }
    
    // Last attempt - just grab any content between paragraph tags
    const fallbackRegex = /<div[^>]*>([\s\S]*?)<\/div>/gi;
    let fullText = '';
    
    while ((m = fallbackRegex.exec(html)) !== null) {
      if (m[1] && m[1].length > 50) { // Only consider substantial content
        const cleaned = m[1].replace(/<[^>]+>/g, '').trim();
        if (cleaned && cleaned.length > 50) {
          fullText += cleaned + '\n\n';
        }
      }
    }
    
    if (fullText) {
      return fullText.trim();
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
    // First attempt - time element with datetime attribute
    const timeRegex = /<time[^>]*datetime="([^"]+)"[^>]*>/i;
    let match = html.match(timeRegex);
    
    if (match && match[1]) {
      return new Date(match[1]);
    }
    
    // Second attempt - looking for relative time indicators
    const relativeRegex = /(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i;
    match = html.match(relativeRegex);
    
    if (match && match[1] && match[2]) {
      const amount = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();
      
      const now = new Date();
      
      switch (unit) {
        case 'second':
          return new Date(now.getTime() - amount * 1000);
        case 'minute':
          return new Date(now.getTime() - amount * 60 * 1000);
        case 'hour':
          return new Date(now.getTime() - amount * 60 * 60 * 1000);
        case 'day':
          return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
        case 'week':
          return new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000);
        case 'month':
          // Approximate month as 30 days
          return new Date(now.getTime() - amount * 30 * 24 * 60 * 60 * 1000);
        case 'year':
          // Approximate year as 365 days
          return new Date(now.getTime() - amount * 365 * 24 * 60 * 60 * 1000);
      }
    }
    
    // Third attempt - looking for specific date formats in text
    const dateTextRegex = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:[a-z]{2})?,?\s+(\d{4})/i;
    match = html.match(dateTextRegex);
    
    if (match && match[1] && match[2] && match[3]) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames.findIndex(m => match![1].startsWith(m));
      
      if (month !== -1) {
        const day = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        return new Date(year, month, day);
      }
    }
    
    // If we can't find a specific date, return the current date
    console.log('No date found, using current date');
    return new Date();
  } catch (error) {
    console.error('Error extracting published date:', error);
    return new Date(); // Return current date as fallback
  }
}