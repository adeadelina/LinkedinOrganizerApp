import React from "react";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  category: string;
  className?: string;
  onClick?: (e?: React.MouseEvent) => void;
  isSelected?: boolean;
}

export function CategoryFilter({ category, className, onClick, isSelected = false }: CategoryFilterProps) {
  // Define category styles based on the category name - using hash based algorithm to ensure consistent colors
  const getCategoryStyles = (category: string) => {
    // Predefined categories with specific colors
    const predefinedStyles: Record<string, string> = {
      "PLG Strategy": "bg-blue-100 text-blue-800",
      "Pricing experiments": "bg-purple-100 text-purple-800",
      "Onboarding": "bg-orange-100 text-orange-800",
      "Stakeholder management": "bg-pink-100 text-pink-800",
      "AI tools for PM": "bg-indigo-100 text-indigo-800",
      "Communication": "bg-green-100 text-green-800",
      "Coaching": "bg-yellow-100 text-yellow-800",
      "Free trial": "bg-indigo-100 text-indigo-800",
    };

    // If category has a predefined style, use it
    if (predefinedStyles[category]) {
      return predefinedStyles[category];
    }

    // Otherwise, generate a color based on the hash of the category name
    // This ensures the same category always gets the same color
    const colorOptions = [
      "bg-blue-100 text-blue-800",
      "bg-purple-100 text-purple-800",
      "bg-orange-100 text-orange-800",
      "bg-pink-100 text-pink-800",
      "bg-indigo-100 text-indigo-800",
      "bg-green-100 text-green-800",
      "bg-yellow-100 text-yellow-800",
      "bg-red-100 text-red-800",
      "bg-emerald-100 text-emerald-800",
      "bg-teal-100 text-teal-800",
      "bg-cyan-100 text-cyan-800",
    ];
    
    // Use string hash to pick a color from the options
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = ((hash << 5) - hash) + category.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    const colorIndex = Math.abs(hash) % colorOptions.length;
    return colorOptions[colorIndex];
  };

  return (
    <span 
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        getCategoryStyles(category),
        isSelected && "ring-2 ring-offset-1",
        onClick && "cursor-pointer hover:opacity-90 transition-opacity",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {category}
      {isSelected && (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-3 w-3 ml-1" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path 
            fillRule="evenodd" 
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
            clipRule="evenodd" 
          />
        </svg>
      )}
    </span>
  );
}
