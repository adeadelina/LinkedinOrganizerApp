import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { PostInput } from "@/components/post-input";
import { FilterControls } from "@/components/filter-controls";
import { PostsList } from "@/components/posts-list";
import { CategoriesSection } from "@/components/category-section";
import { Post, Category, FilterOptions } from "@/lib/types";

export default function Dashboard() {
  // State for filter options
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: "newest",
    categoryId: null
  });
  
  // State for category filters in sidebar
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  
  // Fetch all categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  // Fetch all posts
  const { data: posts = [], isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
  });
  
  // Apply filters to posts
  const filteredPosts = filterPosts(posts, filters, selectedCategories);
  
  // Handle filter changes from the filter controls
  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };
  
  // Handle category click from post cards
  const handleCategoryClick = (category: Category) => {
    setFilters({
      ...filters,
      categoryId: category.id,
    });
  };
  
  // Handle category changes from sidebar
  const handleSidebarCategoryChange = (categoryIds: number[]) => {
    setSelectedCategories(categoryIds);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        selectedCategories={selectedCategories}
        onCategoryChange={handleSidebarCategoryChange}
      />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {/* Header Section */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h1 className="text-2xl font-semibold text-secondary mb-2">LinkedIn Post Analyzer</h1>
                <p className="text-gray-600">Extract, analyze, and categorize LinkedIn posts</p>
                
                {/* Post Input Component */}
                <PostInput />
              </div>
              
              {/* Posts Section */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                  <h2 className="text-xl font-semibold mb-2 sm:mb-0">Analyzed posts</h2>
                  
                  {/* Filter Controls Component */}
                  <FilterControls 
                    categories={categories}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                  />
                </div>
                
                {/* Posts List Component */}
                <PostsList 
                  posts={filteredPosts}
                  loading={postsLoading} 
                  onCategoryClick={handleCategoryClick}
                />
                
                {/* Categories Section Component */}
                {!postsLoading && !categoriesLoading && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 mt-8">
                    <CategoriesSection 
                      categories={categories}
                      posts={posts}
                      onCategoryClick={handleCategoryClick}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Helper function to filter and sort posts
function filterPosts(
  posts: Post[], 
  filters: FilterOptions,
  selectedCategories: number[]
): Post[] {
  let result = [...posts];
  
  // Filter by category ID if specified
  if (filters.categoryId) {
    result = result.filter(post => 
      post.categories.some(cat => cat.id === filters.categoryId)
    );
  }
  
  // Filter by selected categories from sidebar
  if (selectedCategories.length > 0) {
    result = result.filter(post => 
      post.categories.some(cat => selectedCategories.includes(cat.id))
    );
  }
  
  // Sort posts
  result.sort((a, b) => {
    switch (filters.sortBy) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "name":
        return a.authorName.localeCompare(b.authorName);
      default:
        return 0;
    }
  });
  
  return result;
}
