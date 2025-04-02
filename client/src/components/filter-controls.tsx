import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Category, FilterOptions, SortOption } from "@/lib/types";

interface FilterControlsProps {
  categories: Category[];
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

export function FilterControls({ categories, filters, onFilterChange }: FilterControlsProps) {
  // Handle category selection change
  const handleCategoryChange = (value: string) => {
    onFilterChange({
      ...filters,
      categoryId: value === "all" ? null : parseInt(value),
    });
  };
  
  // Handle sort option change
  const handleSortChange = (value: string) => {
    onFilterChange({
      ...filters,
      sortBy: value as SortOption,
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <div className="relative w-44">
        <Select
          value={filters.categoryId ? String(filters.categoryId) : "all"}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={String(category.id)}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="relative w-44">
        <Select
          value={filters.sortBy}
          onValueChange={handleSortChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Most Recent</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="name">Alphabetical</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Button 
        variant="outline" 
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        <i className="fas fa-sliders-h mr-2"></i>
        More Filters
      </Button>
    </div>
  );
}
