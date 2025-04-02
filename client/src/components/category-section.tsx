import React from "react";
import { PostsList } from "@/components/posts-list";
import { Post, Category } from "@/lib/types";

interface CategorySectionProps {
  category: Category;
  posts: Post[];
  onCategoryClick?: (category: Category) => void;
}

export function CategorySection({ category, posts, onCategoryClick }: CategorySectionProps) {
  // Only render if we have posts for this category
  if (!posts || posts.length === 0) {
    return null;
  }

  return (
    <div className="col-span-1 lg:col-span-2 xl:col-span-3 mt-8">
      <h4 className="font-medium text-md mb-4">{category.name}</h4>
      <PostsList posts={posts} onCategoryClick={onCategoryClick} />
    </div>
  );
}

interface CategoriesSectionProps {
  categories: Category[];
  posts: Post[];
  onCategoryClick?: (category: Category) => void;
}

export function CategoriesSection({ categories, posts, onCategoryClick }: CategoriesSectionProps) {
  // Group posts by category
  const postsByCategory = categories.reduce((acc, category) => {
    const categoryPosts = posts.filter(post => 
      post.categories.some(c => c.id === category.id)
    );
    
    if (categoryPosts.length > 0) {
      acc[category.id] = categoryPosts;
    }
    
    return acc;
  }, {} as Record<number, Post[]>);
  
  // Filter out categories with no posts
  const categoriesWithPosts = categories.filter(category => 
    postsByCategory[category.id]?.length > 0
  );
  
  if (categoriesWithPosts.length === 0) {
    return null;
  }

  return (
    <>
      <div className="col-span-1 lg:col-span-2 xl:col-span-3 mt-6 mb-2">
        <h3 className="text-lg font-medium border-b pb-2">Categories</h3>
      </div>
      
      {categoriesWithPosts.map(category => (
        <CategorySection
          key={category.id}
          category={category}
          posts={postsByCategory[category.id] || []}
          onCategoryClick={onCategoryClick}
        />
      ))}
      
      <div className="col-span-1 lg:col-span-2 xl:col-span-3 flex justify-center mt-6">
        <button className="flex items-center text-primary hover:text-primary/80 px-4 py-2 text-sm">
          <i className="fas fa-chevron-circle-down mr-2"></i> View more
        </button>
      </div>
    </>
  );
}
