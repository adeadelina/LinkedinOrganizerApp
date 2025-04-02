import React from "react";
import { cn } from "@/lib/utils";
import { Category } from "@/lib/types";

interface CategoryTagProps {
  category: Category;
  className?: string;
  onClick?: () => void;
}

export function CategoryTag({ category, className, onClick }: CategoryTagProps) {
  const style = {
    backgroundColor: category.bgColor,
    color: category.textColor,
  };
  
  return (
    <span 
      style={style}
      className={cn(
        "px-2 py-1 text-xs font-medium rounded inline-block",
        onClick ? "cursor-pointer hover:opacity-90" : "",
        className
      )}
      onClick={onClick}
    >
      {category.name}
    </span>
  );
}

interface CategoryTagsProps {
  categories: Category[];
  className?: string;
  onCategoryClick?: (category: Category) => void;
}

export function CategoryTags({ categories, className, onCategoryClick }: CategoryTagsProps) {
  if (!categories || categories.length === 0) {
    return null;
  }
  
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {categories.map((category) => (
        <CategoryTag 
          key={category.id} 
          category={category} 
          onClick={onCategoryClick ? () => onCategoryClick(category) : undefined}
        />
      ))}
    </div>
  );
}
