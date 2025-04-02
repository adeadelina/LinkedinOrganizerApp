import React from "react";
import { CategoryTags } from "@/components/category-tag";
import { formatRelativeTime, getStatusDisplay } from "@/lib/utils";
import { Post, Category } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PostCardProps {
  post: Post;
  onCategoryClick?: (category: Category) => void;
}

export function PostCard({ post, onCategoryClick }: PostCardProps) {
  // Format the created time as a relative string
  const timeAgo = formatRelativeTime(new Date(post.createdAt));
  
  // Get status display info
  const status = getStatusDisplay(post.status);
  
  // Get the initials for the avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm relative">
      <div className="p-4 flex items-center gap-3 border-b border-gray-200">
        <Avatar className="w-9 h-9">
          <AvatarImage src={post.authorImage || undefined} alt={post.authorName} />
          <AvatarFallback className="bg-gray-200 text-gray-600">
            {getInitials(post.authorName)}
          </AvatarFallback>
        </Avatar>
        
        <div>
          <p className="font-medium text-sm">{post.authorName}</p>
          <p className="text-xs text-gray-500">{post.authorTitle || ""}</p>
        </div>
        
        <div className="absolute right-4 top-4 text-xs text-gray-500">
          {timeAgo}
        </div>
      </div>
      
      <div className={`p-4 text-sm ${post.status === 'processing' ? 'min-h-[120px] flex items-center justify-center' : ''}`}>
        {post.status === 'processing' ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing post content...
          </div>
        ) : (
          post.content.split("\n").map((paragraph, index) => (
            <p key={index} className={index < post.content.split("\n").length - 1 ? "mb-2" : ""}>
              {paragraph}
            </p>
          ))
        )}
      </div>
      
      {post.status !== 'processing' && post.categories.length > 0 && (
        <div className="px-4 pb-4">
          <CategoryTags 
            categories={post.categories} 
            onCategoryClick={onCategoryClick}
          />
        </div>
      )}
      
      <div className="border-t border-gray-200 p-3 flex justify-between items-center bg-gray-50">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="flex items-center">
            <i className={`fas ${status.icon} ${status.color} mr-1`}></i> {status.text}
          </div>
        </div>
        
        <div className="flex gap-2">
          <button className={`text-gray-500 px-2 py-1 text-sm hover:bg-gray-100 rounded ${post.status === 'processing' ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={post.status === 'processing'}>
            <i className="far fa-edit mr-1"></i> Edit
          </button>
          
          <button className={`${post.status === 'processing' ? 'text-gray-500' : 'text-primary'} px-2 py-1 text-sm hover:bg-gray-100 rounded ${post.status === 'processing' ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={post.status === 'processing'}>
            <i className="far fa-eye mr-1"></i> View
          </button>
        </div>
      </div>
    </div>
  );
}
