// Category data type
export interface Category {
  id: number;
  name: string;
  bgColor: string;
  textColor: string;
}

// Post data type with categories
export interface Post {
  id: number;
  linkedinUrl: string;
  authorName: string;
  authorImage: string | null;
  authorTitle: string | null;
  content: string;
  createdAt: string | Date;
  analyzedAt: string | Date;
  status: "processing" | "analyzed" | "failed";
  categories: Category[];
}

// Filter types
export type SortOption = "newest" | "oldest" | "name";

export interface FilterOptions {
  categoryId?: number | null;
  sortBy: SortOption;
}

// Type for the sidebar category filter items
export interface CategoryFilter {
  id: number;
  name: string;
  checked: boolean;
}
