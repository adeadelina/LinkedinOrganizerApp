import React from "react";
import { PostCard } from "@/components/post-card";
import { Post, Category } from "@/lib/types";

interface PostsListProps {
  posts: Post[];
  loading?: boolean;
  onCategoryClick?: (category: Category) => void;
}

export function PostsList({ posts, loading = false, onCategoryClick }: PostsListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-gray-200 rounded-lg bg-gray-100 overflow-hidden shadow-sm animate-pulse h-60">
            <div className="p-4 h-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">No posts found</h3>
        <p className="mt-2 text-sm text-gray-500">
          Try adding a LinkedIn post by pasting its URL above.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
      {posts.map((post) => (
        <PostCard 
          key={post.id} 
          post={post} 
          onCategoryClick={onCategoryClick} 
        />
      ))}
    </div>
  );
}
