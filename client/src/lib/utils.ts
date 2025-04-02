import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date as a relative time (e.g., "less than a minute ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const parsedDate = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(parsedDate, { addSuffix: true });
}

/**
 * Truncates text to a specified length and adds ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Validates a string as a LinkedIn URL
 */
export function isValidLinkedInUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  
  // Basic URL validation
  try {
    new URL(url);
  } catch {
    return false;
  }
  
  // Check if it's a LinkedIn URL
  return url.toLowerCase().includes("linkedin.com");
}

/**
 * Extracts post ID from a LinkedIn URL
 */
export function extractPostIdFromUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split('/');
    
    // Find the post ID at the end of the path
    for (let i = 0; i < pathParts.length; i++) {
      if (pathParts[i] === "posts" && i + 1 < pathParts.length) {
        return pathParts[i + 1];
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Get status display text based on post status
 */
export function getStatusDisplay(status: string): { 
  text: string;
  icon: string;
  color: string;
} {
  switch (status) {
    case "processing":
      return { 
        text: "Processing", 
        icon: "fa-spinner fa-spin", 
        color: "text-gray-500"
      };
    case "analyzed":
      return { 
        text: "Analyzed", 
        icon: "fa-check-circle", 
        color: "text-green-500"
      };
    case "failed":
      return { 
        text: "Failed", 
        icon: "fa-exclamation-circle", 
        color: "text-red-500"
      };
    default:
      return { 
        text: "Unknown", 
        icon: "fa-question-circle", 
        color: "text-gray-500"
      };
  }
}
