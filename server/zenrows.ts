import axios from "axios";

const API_KEY = process.env.ZENROWS_API_KEY;
const ZENROWS_URL = "https://api.zenrows.com/v1/";

/**
 * Transform LinkedIn URLs to a more scrapable format
 * @param url Original LinkedIn URL
 * @returns Transformed URL for better scraping
 */
function transformLinkedInUrl(url: string): string {
  console.log(`Transforming LinkedIn URL: ${url}`);

  // First clean the URL by removing tracking parameters
  let cleanUrl = url;
  if (cleanUrl.includes("?")) {
    cleanUrl = cleanUrl.split("?")[0];
    console.log(`Removed query parameters: ${cleanUrl}`);
  }

  // Extract the activity ID from various URL patterns
  let activityId: string | null = null;

  // Pattern 1: /feed/update/ URLs
  let match = cleanUrl.match(/\/feed\/update\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    activityId = match[1];
    console.log(`Extracted activity ID from feed URL: ${activityId}`);
  }

  // Pattern 2: /posts/ URLs with activity ID
  if (!activityId) {
    match = cleanUrl.match(/\/posts\/.*activity-([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      activityId = match[1];
      console.log(`Extracted activity ID from posts URL: ${activityId}`);
    }
  }

  // Pattern 3: Direct activity ID pattern
  if (!activityId) {
    match = cleanUrl.match(/activity[:\-]([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) {
      activityId = match[1];
      console.log(`Extracted activity ID from URL: ${activityId}`);
    }
  }

  // Pattern 4: urn:li:activity: pattern in the URL
  if (!activityId) {
    match = cleanUrl.match(/urn:li:activity:([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      activityId = match[1];
      console.log(`Extracted activity ID from URN: ${activityId}`);
    }
  }

  // If we found an activity ID, build the most reliable URL format
  if (activityId) {
    // Default to the most reliable format for public post URLs
    // Posts URLs work better than feed/update URLs
    const transformedUrl = `https://www.linkedin.com/posts/activity-${activityId}`;
    console.log(`Transformed to standard format: ${transformedUrl}`);
    return transformedUrl;
  }

  // If it's already a /posts/ URL without activity, keep it as is
  if (cleanUrl.includes("/posts/")) {
    console.log(`Using cleaned posts URL: ${cleanUrl}`);
    return cleanUrl;
  }

  // Default case - return the cleaned URL
  console.log(`Using cleaned URL: ${cleanUrl}`);
  return cleanUrl;
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
    // Use the original URL as requested
    console.log(`Scraping LinkedIn post from URL: ${url}`);

    // Configure the request parameters for ZenRows with the exact parameters as specified
    const params = {
      url: url,
      apikey: API_KEY,
      autoparse: "true",
    };

    // Make the request to ZenRows API
    console.log("Sending request to ZenRows API...");
    const response = await axios.get(ZENROWS_URL, { params });

    // Check if we got a valid response
    if (!response.data) {
      throw new Error("No data returned from ZenRows API");
    }

    const responseData = response.data;
    console.log(`Received response type: ${typeof responseData}`);

    // For debugging purposes in development, save a sample of the response
    if (process.env.NODE_ENV !== "production") {
      const sampleText =
        typeof responseData === "string"
          ? responseData.substring(0, 500) + "... [truncated]"
          : JSON.stringify(responseData).substring(0, 500) + "... [truncated]";
      console.log("Sample response:", sampleText);
    }

    // Check if response is from custom_js or autoparse (object with structured data)
    if (typeof responseData === "object" && responseData !== null) {
      console.log("Processing object response from ZenRows API");

      // Check if there was an error in the custom JS
      if (responseData.error) {
        console.error(`Error in extraction: ${responseData.error}`);
      }

      // Try to extract data from Schema.org format (autoparse=true response)
      if (Array.isArray(responseData) && responseData.length > 0) {
        console.log("Processing autoparse array response");
        const schemaData = responseData[0];

        // Extract author information from schema
        let authorName = "LinkedIn User";
        let authorImage = "";

        // Find author from potential schema locations
        if (schemaData.author && schemaData.author["@type"] === "Person") {
          authorName = schemaData.author.name || authorName;
          authorImage = schemaData.author.image["url"] || authorImage;
        }

        // For posts type articles where there is no "author" but there's a creator
        if (schemaData.creator && schemaData.creator["@type"] === "Person") {
          authorName = schemaData.creator.name || authorName;
          authorImage = schemaData.creator.image["url"] || authorImage;
        }

        // Find content from schema - check multiple potential fields
        let content = "";
        if (schemaData.text) {
          content = schemaData.text;
        } else if (schemaData.articleBody) {
          content = schemaData.articleBody;
        } else if (schemaData.description) {
          content = schemaData.description;
        } else if (schemaData.headline) {
          content = schemaData.headline;
        } else if (
          schemaData.comment &&
          Array.isArray(schemaData.comment) &&
          schemaData.comment.length > 0
        ) {
          // If we have comments, extract the first comment's text as content
          content = schemaData.comment[0].text || "";
        }

        if (!content || content.length < 10) {
          console.log("No meaningful content found in schema data");
          content = "No content available";
        }

        // Extract date if available
        let publishedDate = new Date();
        if (schemaData.datePublished) {
          try {
            publishedDate = new Date(schemaData.datePublished);
          } catch (error) {
            console.error(`Error parsing date: ${error}`);
          }
        }

        console.log(
          `Extracted from schema: Author: "${authorName}", Content length: ${content.length}`,
        );

        return {
          authorName,
          authorImage,
          content,
          publishedDate,
        };
      }

      // Regular custom_js response format
      const authorName = responseData.authorName || "LinkedIn User";
      const authorImage = responseData.authorImage || "";
      const content = responseData.content || "No content available";

      // Process the date string if it exists
      let publishedDate = new Date();
      if (responseData.publishedDate) {
        try {
          // Try to parse date string like "2w" (2 weeks), "3d" (3 days), etc.
          const timePeriodMatch =
            responseData.publishedDate.match(/(\d+)([wdhm])/);
          if (timePeriodMatch) {
            const value = parseInt(timePeriodMatch[1]);
            const unit = timePeriodMatch[2];

            publishedDate = new Date();
            if (unit === "w")
              publishedDate.setDate(publishedDate.getDate() - value * 7);
            else if (unit === "d")
              publishedDate.setDate(publishedDate.getDate() - value);
            else if (unit === "h")
              publishedDate.setHours(publishedDate.getHours() - value);
            else if (unit === "m")
              publishedDate.setMinutes(publishedDate.getMinutes() - value);
          } else {
            // If it's not a time period, try to parse it directly
            const parsedDate = new Date(responseData.publishedDate);
            if (!isNaN(parsedDate.getTime())) {
              publishedDate = parsedDate;
            }
          }
        } catch (error) {
          console.error(`Error parsing date: ${error}`);
        }
      }

      // Log the extracted information
      console.log(
        `Extracted from custom JS: Author: "${authorName}", Content length: ${content ? content.length : 0}`,
      );

      // If we have both author and content, return the extracted data
      if (authorName && content && content.length > 20) {
        return {
          authorName,
          authorImage,
          content,
          publishedDate,
        };
      }

      // If we got rawHtml as fallback and missing content, try to extract from HTML
      if (responseData.rawHtml && (!content || content.length < 20)) {
        console.log("Using rawHtml fallback for extraction");
        const html = responseData.rawHtml;

        // Try to extract missing fields from HTML
        const extractedAuthorName =
          !authorName || authorName === "LinkedIn User"
            ? extractAuthorName(html) || authorName
            : authorName;
        const extractedAuthorImage = !authorImage
          ? extractAuthorImage(html) || ""
          : authorImage;
        const extractedContent =
          !content || content.length < 20
            ? extractPostContent(html) || "No content available"
            : content;

        return {
          authorName: extractedAuthorName,
          authorImage: extractedAuthorImage,
          content: extractedContent,
          publishedDate,
        };
      }
    }

    // Handle plaintext response (basic string response)
    if (typeof responseData === "string" && !responseData.includes("<")) {
      console.log("Processing plaintext response from ZenRows");

      // Process the text line by line for more precision
      const allLines = responseData.split("\n");
      let processedLines = [];
      let foundHeader = false;
      let foundAuthorSection = false;
      let authorNameLine = "";
      let authorRoleLine = "";

      // Find the actual post content, skipping LinkedIn header
      for (let i = 0; i < allLines.length; i++) {
        const line = allLines[i].trim();

        // Skip empty lines
        if (line.length === 0) continue;

        // Check if we found the author's post section
        if (line.endsWith("'s Post") || line.includes("'s Post")) {
          foundAuthorSection = true;
          authorNameLine = line.replace("'s Post", "").trim();
          continue;
        }

        // If we found the author's section, the next non-empty line is likely the author's role
        if (foundAuthorSection && authorRoleLine === "") {
          authorRoleLine = line;
          continue;
        }

        // Skip LinkedIn header sections
        if (
          line === "Agree & Join LinkedIn" ||
          line.includes("User Agreement") ||
          line.includes("Privacy Policy") ||
          line.includes("Cookie Policy") ||
          line === "LinkedIn" ||
          line === "Articles" ||
          line === "People" ||
          line === "Learning" ||
          line === "Jobs" ||
          line === "Games" ||
          line === "Get the app" ||
          line === "Join now" ||
          line === "Sign in" ||
          line.startsWith("By clicking Continue")
        ) {
          continue;
        }

        // When we find "Report this post", we've found the start of the actual content
        if (line === "Report this post") {
          foundHeader = true;
          continue; // Skip this line
        }

        // Only add lines after we've found the header
        if (foundHeader) {
          processedLines.push(line);
        }
      }

      if (processedLines.length === 0) {
        throw new Error(
          "No content found in plaintext response after processing",
        );
      }

      console.log(
        `Processed ${processedLines.length} lines of content after removing LinkedIn headers`,
      );

      // Use the author name we found in the post, or default if not found
      const authorName = authorNameLine || "LinkedIn User";

      // Join the processed lines as content
      const content =
        processedLines.join("\n").trim() || "No content available";

      // We don't have image or date in plaintext, so use defaults
      const authorImage = "";
      const publishedDate = new Date();

      console.log(
        `Extracted from plaintext: Author: "${authorName}", Content length: ${content.length}`,
      );

      return {
        authorName,
        authorImage,
        content,
        publishedDate,
      };
    }

    // If we reach here, it's raw HTML response
    console.log("Processing HTML response from ZenRows");
    const html = responseData;

    // Extract information from the HTML response using our fallback methods
    const authorName = extractAuthorName(html) || "LinkedIn User";
    const authorImage = extractAuthorImage(html) || "";
    const content = extractPostContent(html) || "No content available";
    const publishedDate = extractPublishedDate(html) || new Date();

    return {
      authorName,
      authorImage,
      content,
      publishedDate,
    };
  } catch (error: any) {
    console.error("Error scraping LinkedIn post:", error);

    // Extract the error response if it exists
    const zenRowsError = error?.response?.data;

    if (zenRowsError) {
      const errorCode = zenRowsError.code;
      const errorTitle = zenRowsError.title;
      const errorStatus = zenRowsError.status;

      // Create a more descriptive error message based on ZenRows error code
      // Reference: https://docs.zenrows.com/api-error-codes
      if (errorCode === "RESP001") {
        throw new Error(
          `Failed to scrape LinkedIn post: Content extraction failed (code: ${errorCode}). This post might be protected or require authentication.`,
        );
      } else if (errorCode === "RESP002") {
        throw new Error(
          `Failed to scrape LinkedIn post: Request timed out (code: ${errorCode}). LinkedIn page took too long to load.`,
        );
      } else if (errorCode === "RESP003") {
        throw new Error(
          `Failed to scrape LinkedIn post: JS rendering error (code: ${errorCode}). Try disabling JavaScript rendering.`,
        );
      } else if (errorCode === "API001") {
        throw new Error(
          `Failed to scrape LinkedIn post: Invalid API key (code: ${errorCode}). Please update your ZenRows API key.`,
        );
      } else if (errorCode === "API002") {
        throw new Error(
          `Failed to scrape LinkedIn post: Rate limit exceeded (code: ${errorCode}). Please try again later.`,
        );
      } else if (errorCode === "API003") {
        throw new Error(
          `Failed to scrape LinkedIn post: Usage limit reached (code: ${errorCode}). Please upgrade your ZenRows plan.`,
        );
      } else {
        throw new Error(
          `Failed to scrape LinkedIn post: ${errorTitle || "Unknown error"} (code: ${errorCode}, status: ${errorStatus})`,
        );
      }
    }

    // If we can't extract the ZenRows error, use the generic error message
    throw new Error(
      `Failed to scrape LinkedIn post: ${error.message || "Unknown error"}`,
    );
  }
}

/**
 * Extract the author's name from HTML
 */
function extractAuthorName(html: string): string | null {
  try {
    console.log(`Attempting to extract author name from HTML`);

    // First attempt - 2023-2024 LinkedIn patterns with author class
    const newAuthorRegex =
      /<(?:span|div|a)[^>]*(?:class|data-test-id)[^>]*(?:actor-name|author-name|profile-name|display-name)[^>]*>([\s\S]*?)<\/(?:span|div|a)>/i;
    let match = html.match(newAuthorRegex);

    if (match && match[1]) {
      const name = match[1].replace(/<[^>]+>/g, "").trim();
      if (name.length > 2 && name.length < 50) {
        console.log(`Extracted author using new pattern: "${name}"`);
        return name;
      }
    }

    // Second attempt - common actor name pattern (traditional)
    const actorRegex =
      /<span[^>]*class="[^"]*actor-name[^"]*"[^>]*>([\s\S]*?)<\/span>/i;
    match = html.match(actorRegex);

    if (match && match[1]) {
      const name = match[1].replace(/<[^>]+>/g, "").trim();
      if (name.length > 2) {
        console.log(`Extracted author using actor pattern: "${name}"`);
        return name;
      }
    }

    // Third attempt - profile links (most reliable for public posts)
    const profileRegex = /<a[^>]*href="[^"]*\/in\/[^"]*"[^>]*>([\s\S]*?)<\/a>/i;
    match = html.match(profileRegex);

    if (match && match[1]) {
      const name = match[1].replace(/<[^>]+>/g, "").trim();
      if (name.length > 2 && name.length < 50) {
        console.log(`Extracted author from profile link: "${name}"`);
        return name;
      }
    }

    // Fourth attempt - name in title (common in single post views)
    const titleRegex =
      /<title[^>]*>([^|:]+)(?:\s+on\s+LinkedIn:?|\s+\|[^|]+LinkedIn)[\s\S]*?<\/title>/i;
    match = html.match(titleRegex);

    if (match && match[1]) {
      const name = match[1].trim();
      if (
        name.length > 2 &&
        name.length < 50 &&
        !name.toLowerCase().includes("linkedin")
      ) {
        console.log(`Extracted author from title: "${name}"`);
        return name;
      }
    }

    // Fifth attempt - header section with name
    const headerRegex = /<header[^>]*>([\s\S]*?)<\/header>/gi;
    let headers = [];
    let m;

    while ((m = headerRegex.exec(html)) !== null) {
      if (m[1]) {
        // Extract text content from header
        const headerText = m[1]
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (headerText.length > 0 && headerText.length < 100) {
          headers.push(headerText);
        }
      }
    }

    // Find the header most likely to contain a name (shorter, with spaces)
    headers = headers
      .filter((h) => h.includes(" ") && h.length > 5 && h.length < 50)
      .sort((a, b) => a.length - b.length); // Sort by length, shortest first

    if (headers.length > 0) {
      console.log(`Extracted author from header: "${headers[0]}"`);
      return headers[0];
    }

    // Sixth attempt - find meta name tags
    const metaNameRegex =
      /<meta[^>]*name="author"[^>]*content="([^"]+)"[^>]*>/i;
    match = html.match(metaNameRegex);

    if (match && match[1]) {
      const name = match[1].trim();
      if (name.length > 2) {
        console.log(`Extracted author from meta tag: "${name}"`);
        return name;
      }
    }

    // Last attempt - look for potential name spans near the top
    const topHtml = html.substring(0, Math.min(html.length, 15000)); // Look in first 15K chars only
    const nameSpanRegex = /<(?:span|div|p)[^>]*>([\s\S]*?)<\/(?:span|div|p)>/gi;
    const potentialNames = [];

    while ((m = nameSpanRegex.exec(topHtml)) !== null) {
      if (m[1]) {
        const text = m[1].replace(/<[^>]+>/g, "").trim();
        // Check if it looks like a name (2-3 words, proper length, capital first letters)
        if (
          text &&
          text.length > 2 &&
          text.length < 40 &&
          text.includes(" ") &&
          /^[A-Z][a-z]+(\s+[A-Z][a-z]+){1,2}$/.test(text)
        ) {
          potentialNames.push(text);
        }
      }
    }

    if (potentialNames.length > 0) {
      console.log(
        `Extracted potential author from content: "${potentialNames[0]}"`,
      );
      return potentialNames[0];
    }

    console.log("No author name found, using default");
    return "LinkedIn User";
  } catch (error) {
    console.error("Error extracting author name:", error);
    return "LinkedIn User";
  }
}

/**
 * Extract the author's profile image URL from HTML
 */
function extractAuthorImage(html: string): string | null {
  try {
    console.log(`Attempting to extract author image from HTML`);

    // First attempt - 2023-2024 specific profile patterns
    const newProfileRegex =
      /<img[^>]*(?:class|data-test-id)[^>]*(?:profile-image|user-image|avatar-image|actor-image)[^>]*src="([^"]+)"[^>]*>/i;
    let match = html.match(newProfileRegex);

    if (match && match[1]) {
      console.log(
        `Found profile image using new pattern: ${match[1].substring(0, 50)}...`,
      );
      return match[1];
    }

    // Second attempt - profile images with explicit class
    const profileRegex =
      /<img[^>]*class="[^"]*(?:profile|avatar)[^"]*"[^>]*src="([^"]+)"[^>]*>/i;
    match = html.match(profileRegex);

    if (match && match[1]) {
      console.log(
        `Found profile image using class pattern: ${match[1].substring(0, 50)}...`,
      );
      return match[1];
    }

    // Third attempt - profile picture in meta tags
    const metaImageRegex =
      /<meta[^>]*property="og:image"[^>]*content="([^"]+)"[^>]*>/i;
    match = html.match(metaImageRegex);

    if (match && match[1]) {
      console.log(
        `Found profile image in meta tag: ${match[1].substring(0, 50)}...`,
      );
      return match[1];
    }

    // Fourth attempt - images with specific alt text patterns
    const altRegex =
      /<img[^>]*alt="[^"]*(?:profile|photo|picture|avatar|headshot)[^"]*"[^>]*src="([^"]+)"[^>]*>/i;
    match = html.match(altRegex);

    if (match && match[1]) {
      console.log(
        `Found profile image with alt text: ${match[1].substring(0, 50)}...`,
      );
      return match[1];
    }

    // Fifth attempt - style background images
    const bgImageRegex =
      /background-image:\s*url\(['"](https:\/\/[^'"]+)['"]\)/i;
    match = html.match(bgImageRegex);

    if (match && match[1]) {
      console.log(`Found background image: ${match[1].substring(0, 50)}...`);
      return match[1];
    }

    // Last attempt - any image that appears to be a profile picture
    const imageRegex = /<img[^>]*src="([^"]+)"[^>]*>/gi;
    let m;
    const potentialImages = [];

    while ((m = imageRegex.exec(html)) !== null) {
      // Filter and score potential profile images
      if (m[1] && typeof m[1] === "string") {
        let score = 0;
        const url = m[1].toLowerCase();

        // Score based on URL keywords
        if (url.includes("profile")) score += 5;
        if (url.includes("avatar")) score += 4;
        if (url.includes("user")) score += 3;
        if (url.includes("photo")) score += 2;
        if (url.includes("headshot")) score += 4;
        if (url.includes("linkedin.com/media")) score += 3;
        if (url.includes("licdn.com")) score += 2;

        // Add to potential images if score is high enough
        if (score > 0) {
          potentialImages.push({ url: m[1], score });
        }
      }
    }

    // If we found potential profile images, return the highest scored one
    if (potentialImages.length > 0) {
      potentialImages.sort((a, b) => b.score - a.score);
      console.log(
        `Found potential profile image with score ${potentialImages[0].score}: ${potentialImages[0].url.substring(0, 50)}...`,
      );
      return potentialImages[0].url;
    }

    console.log("No profile image found");
    return "";
  } catch (error) {
    console.error("Error extracting author image:", error);
    return "";
  }
}

/**
 * Extract the post content from HTML
 */
function extractPostContent(html: string): string | null {
  try {
    console.log(
      `Attempting to extract post content from HTML of length: ${html.length}`,
    );

    // First attempt - 2023-2024 LinkedIn feed post pattern
    const newFeedRegex =
      /<div[^>]*(?:class|data-test-id)[^>]*(?:feed-shared-update|update-content|post-content)[^>]*>([\s\S]*?)<\/div>/i;
    let match = html.match(newFeedRegex);

    if (match && match[1]) {
      const content = match[1]
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .trim();

      if (content.length > 20) {
        console.log(
          `Extracted content using new feed pattern (${content.length} chars)`,
        );
        return content;
      }
    }

    // Second attempt - traditional LinkedIn feed pattern
    const feedRegex =
      /<div[^>]*class="[^"]*feed-shared-update-v2__description[^"]*"[^>]*>([\s\S]*?)<\/div>/i;
    match = html.match(feedRegex);

    if (match && match[1]) {
      const content = match[1]
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .trim();

      if (content.length > 20) {
        console.log(
          `Extracted content using feed pattern (${content.length} chars)`,
        );
        return content;
      }
    }

    // Third attempt - span based structures common in modern LinkedIn
    const spanContentRegex =
      /<span[^>]*class="[^"]*(?:break-words|content|text-content)[^"]*"[^>]*>([\s\S]*?)<\/span>/i;
    match = html.match(spanContentRegex);

    if (match && match[1]) {
      const content = match[1]
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .trim();

      if (content.length > 20) {
        console.log(
          `Extracted content using span pattern (${content.length} chars)`,
        );
        return content;
      }
    }

    // Fourth attempt - article-style content with general break-words
    const contentRegex =
      /<div[^>]*class="[^"]*break-words[^"]*"[^>]*>([\s\S]*?)<\/div>/i;
    match = html.match(contentRegex);

    if (match && match[1]) {
      const content = match[1]
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .trim();

      if (content.length > 20) {
        console.log(
          `Extracted content using break-words pattern (${content.length} chars)`,
        );
        return content;
      }
    }

    // Fifth attempt - article content with specific data attributes
    const articleRegex = /<article[^>]*>([\s\S]*?)<\/article>/gi;
    const articles = [];
    let m;

    while ((m = articleRegex.exec(html)) !== null) {
      if (m[1]) {
        const content = m[1]
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]+>/g, "")
          .trim();

        if (content.length > 100) {
          // Substantial article content
          articles.push(content);
        }
      }
    }

    if (articles.length > 0) {
      // Get the longest article content
      const content = articles.sort((a, b) => b.length - a.length)[0];
      console.log(
        `Extracted content from article tag (${content.length} chars)`,
      );
      return content;
    }

    // Sixth attempt - paragraphs collection for article-like content
    const bodyRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    const paragraphs = [];

    while ((m = bodyRegex.exec(html)) !== null) {
      if (m[1]) {
        const paraContent = m[1].replace(/<[^>]+>/g, "").trim();
        if (paraContent.length > 15) {
          // Only add substantial paragraphs
          paragraphs.push(paraContent);
        }
      }
    }

    if (paragraphs.length > 0) {
      const content = paragraphs.join("\n\n");
      console.log(
        `Extracted content from paragraphs (${content.length} chars)`,
      );
      return content;
    }

    // Last attempt - find the largest text blocks in div elements
    const fallbackRegex = /<div[^>]*>([\s\S]*?)<\/div>/gi;
    const textBlocks = [];

    while ((m = fallbackRegex.exec(html)) !== null) {
      if (m[1]) {
        const cleaned = m[1].replace(/<[^>]+>/g, "").trim();
        if (cleaned.length > 100) {
          // Only substantial blocks
          textBlocks.push(cleaned);
        }
      }
    }

    if (textBlocks.length > 0) {
      // Sort by length (descending) and take longest blocks that likely represent the post content
      textBlocks.sort((a, b) => b.length - a.length);
      const content = textBlocks.slice(0, 3).join("\n\n"); // Take top 3 substantial blocks
      console.log(`Extracted content using fallback (${content.length} chars)`);
      return content;
    }

    // If all else fails, look for title text
    const titleRegex = /<title[^>]*>([\s\S]*?)<\/title>/i;
    match = html.match(titleRegex);

    if (match && match[1]) {
      const titleText = match[1].replace(/\s*\|\s*LinkedIn$/, "").trim();
      if (titleText.length > 30) {
        console.log(`Only found title text (${titleText.length} chars)`);
        return `[Post title] ${titleText}`;
      }
    }

    console.log("No suitable content found in HTML");
    return null;
  } catch (error) {
    console.error("Error extracting post content:", error);
    return null;
  }
}

/**
 * Extract the post publication date from HTML
 */
function extractPublishedDate(html: string): Date | null {
  try {
    console.log(`Attempting to extract published date from HTML`);

    // First attempt - meta tags with publication date (most accurate)
    const metaDateRegex =
      /<meta[^>]*(?:property="(?:article:published_time|og:published_time)"|name="(?:published_time|publication-date)")\s+content="([^"]+)"[^>]*>/i;
    let match = html.match(metaDateRegex);

    if (match && match[1]) {
      const date = new Date(match[1]);
      if (!isNaN(date.getTime())) {
        console.log(`Found date in meta tag: ${date.toISOString()}`);
        return date;
      }
    }

    // Second attempt - time element with datetime attribute (common in LinkedIn)
    const timeRegex = /<time[^>]*datetime="([^"]+)"[^>]*>/i;
    match = html.match(timeRegex);

    if (match && match[1]) {
      const date = new Date(match[1]);
      if (!isNaN(date.getTime())) {
        console.log(`Found date in time element: ${date.toISOString()}`);
        return date;
      }
    }

    // Third attempt - published attribute in HTML
    const publishedAttrRegex = /\bpublished(?:At|Date|On)=["']([^"']+)["']/i;
    match = html.match(publishedAttrRegex);

    if (match && match[1]) {
      const date = new Date(match[1]);
      if (!isNaN(date.getTime())) {
        console.log(`Found date in published attribute: ${date.toISOString()}`);
        return date;
      }
    }

    // Fourth attempt - relative time indicators with precise units (hours, days, etc.)
    const relativeRegex =
      /(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i;
    match = html.match(relativeRegex);

    if (match && match[1] && match[2]) {
      const amount = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();

      const now = new Date();
      let date;

      switch (unit) {
        case "second":
          date = new Date(now.getTime() - amount * 1000);
          break;
        case "minute":
          date = new Date(now.getTime() - amount * 60 * 1000);
          break;
        case "hour":
          date = new Date(now.getTime() - amount * 60 * 60 * 1000);
          break;
        case "day":
          date = new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
          break;
        case "week":
          date = new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          // Approximate month as 30 days
          date = new Date(now.getTime() - amount * 30 * 24 * 60 * 60 * 1000);
          break;
        case "year":
          // Approximate year as 365 days
          date = new Date(now.getTime() - amount * 365 * 24 * 60 * 60 * 1000);
          break;
      }

      if (date) {
        console.log(
          `Found relative date: ${date.toISOString()} (${amount} ${unit}s ago)`,
        );
        return date;
      }
    }

    // Fifth attempt - specific date string patterns (Apr 2, 2025 format)
    const dateTextRegex =
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:[a-z]{2})?,?\s+(\d{4})/i;
    match = html.match(dateTextRegex);

    if (match && match[1] && match[2] && match[3]) {
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = monthNames.findIndex((m) => match![1].startsWith(m));

      if (month !== -1) {
        const day = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        const date = new Date(year, month, day);

        if (!isNaN(date.getTime())) {
          console.log(`Found date in text: ${date.toISOString()}`);
          return date;
        }
      }
    }

    // Sixth attempt - ISO-formatted date in the text (2025-04-02 format)
    const isoDateRegex = /\b(\d{4})-(\d{2})-(\d{2})\b/;
    match = html.match(isoDateRegex);

    if (match && match[1] && match[2] && match[3]) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // JS months are 0-based
      const day = parseInt(match[3], 10);

      if (year > 2000 && month >= 0 && month < 12 && day > 0 && day <= 31) {
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          console.log(`Found ISO date: ${date.toISOString()}`);
          return date;
        }
      }
    }

    // Seventh attempt - less precise relative indicators (today, yesterday, etc.)
    const vagueTimeRegex = /\b(today|yesterday)\b/i;
    match = html.match(vagueTimeRegex);

    if (match && match[1]) {
      const term = match[1].toLowerCase();
      const now = new Date();

      if (term === "today") {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        console.log(`Found 'today' reference: ${date.toISOString()}`);
        return date;
      } else if (term === "yesterday") {
        const date = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1,
        );
        console.log(`Found 'yesterday' reference: ${date.toISOString()}`);
        return date;
      }
    }

    // If we can't find a specific date, use the current date
    console.log("No date found, using current date");
    return new Date();
  } catch (error) {
    console.error("Error extracting published date:", error);
    return new Date(); // Return current date as fallback
  }
}
