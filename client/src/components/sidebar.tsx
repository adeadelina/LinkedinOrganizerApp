import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Category, CategoryFilter } from "@/lib/types";

interface SidebarProps {
  selectedCategories: number[];
  onCategoryChange: (categoryIds: number[]) => void;
}

export function Sidebar({ selectedCategories, onCategoryChange }: SidebarProps) {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState(false);
  
  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  // Create category filters with checked state
  const categoryFilters: CategoryFilter[] = categories.map(category => ({
    id: category.id,
    name: category.name,
    checked: selectedCategories.includes(category.id),
  }));
  
  // Display only first 5 categories if not expanded
  const displayedCategories = expanded 
    ? categoryFilters 
    : categoryFilters.slice(0, 5);
  
  // Handle category checkbox change
  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    if (checked) {
      onCategoryChange([...selectedCategories, categoryId]);
    } else {
      onCategoryChange(selectedCategories.filter(id => id !== categoryId));
    }
  };

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 border-r border-neutral-200 bg-white">
        <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-neutral-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary rounded-md">
              <i className="fas fa-chart-bar text-white"></i>
            </div>
            <h1 className="font-semibold text-lg">LinkedIn Analyzer</h1>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <nav className="flex-1 px-2 space-y-1">
            <Link 
              href="/"
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md group ${
                location === "/" 
                  ? "text-secondary bg-neutral-100" 
                  : "text-secondary hover:bg-neutral-100"
              }`}
            >
              <i className="fas fa-tachometer-alt mr-3 text-secondary"></i>
              Dashboard
            </Link>
            <Link 
              href="/import"
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md group ${
                location === "/import" 
                  ? "text-secondary bg-neutral-100" 
                  : "text-secondary hover:bg-neutral-100"
              }`}
            >
              <i className="fas fa-file-import mr-3 text-secondary"></i>
              Import Posts
            </Link>
            <Link 
              href="/search"
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md group ${
                location === "/search" 
                  ? "text-secondary bg-neutral-100" 
                  : "text-secondary hover:bg-neutral-100"
              }`}
            >
              <i className="fas fa-search mr-3 text-secondary"></i>
              Search posts...
            </Link>
            
            <div className="mt-8">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <i className="fas fa-filter mr-2"></i> Filters
                </div>
              </h3>
              
              <div className="mt-4 px-3">
                <h4 className="text-sm font-medium mb-2">Categories</h4>
                <div className="space-y-2">
                  {displayedCategories.map((category) => (
                    <div key={category.id} className="flex items-center">
                      <Checkbox 
                        id={`category-${category.id}`}
                        checked={category.checked}
                        onCheckedChange={(checked) => 
                          handleCategoryChange(category.id, checked === true)
                        }
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <Label 
                        htmlFor={`category-${category.id}`}
                        className="ml-2 block text-sm text-secondary"
                      >
                        {category.name}
                      </Label>
                    </div>
                  ))}
                  
                  {categories.length > 5 && (
                    <div className="flex items-center mt-2">
                      <button 
                        onClick={() => setExpanded(!expanded)}
                        className="text-primary text-sm flex items-center"
                      >
                        <i className={`fas ${expanded ? 'fa-minus-circle' : 'fa-plus-circle'} mr-1 text-xs`}></i>
                        {expanded ? 'View less' : 'View more'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
