import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Archive, Bookmark, Tags, Folder, Eye, Image, Link2, 
  Search, ChevronDown, Filter, CheckSquare, User, Hash,
  Database, ExternalLink, X, Tag
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { CategoryFilter } from "@/components/category-filter";
import { Button } from "@/components/ui/button";

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
}

interface SidebarProps {
  categories?: string[];
  selectedCategories?: string[];
  onCategoryChange?: (category: string) => void;
  onSearch?: (term: string, searchBy: "keyword" | "author") => void;
  posts?: Array<{ processingStatus: string }>;
}

const SidebarItem = ({ href, icon, label, count, active }: SidebarItemProps) => {
  return (
    <Link href={href}>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
          active 
            ? "bg-primary/10 text-primary font-medium" 
            : "text-gray-700 hover:bg-gray-100"
        )}
      >
        <span className={active ? "text-primary" : "text-gray-500"}>{icon}</span>
        <span className="flex-grow">{label}</span>
        {count !== undefined && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
        )}
      </div>
    </Link>
  );
};

export function Sidebar({ categories = [], selectedCategories = [], onCategoryChange, onSearch, posts = [] }: SidebarProps) {
  const [location] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState<"all" | "keyword" | "author">("all");
  const [showFilters, setShowFilters] = useState(true);
  const [showCategories, setShowCategories] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");

  const filteredCategories = categories.filter(category => 
    category.toLowerCase().includes(categoryFilter.toLowerCase())
  );

  const handleSearch = () => {
    if (onSearch) {
      onSearch(searchTerm, searchBy);
    }
  };

  return (
    <div className="bg-white w-60 min-h-screen border-r border-gray-100 py-4 flex flex-col">




      <div className="mb-4">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50"
        >
          <span className="text-sm font-medium">
              All Bookmarks
            </span>
          <ChevronDown 
            size={16} 
            className={`text-gray-500 transition-transform ${showFilters ? 'rotate-180' : ''}`} 
          />
        </button>

        {showFilters && (
          <div className="mt-1">
            <SidebarItem 
              href="/" 
              icon={<Bookmark size={16} />} 
              label="All Posts" 
              active={location === "/"} 
              count={posts.filter(post => post.processingStatus === "completed").length}
            />
            <SidebarItem 
              href="/unread" 
              icon={<Eye size={16} />} 
              label="Uncategorized" 
              count={posts.filter(post => (!post.categories || post.categories.length === 0) && post.processingStatus === "completed").length}
            />
          </div>
        )}
      </div>

      {/* Categories section with collapsible header */}
      <div className="mb-4">
        <button 
          onClick={() => setShowCategories(!showCategories)}
          className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50"
        >
          <span className="text-sm font-medium flex items-center">
            <Tags size={16} className="mr-2 text-primary" />
            Categories
          </span>
          <ChevronDown 
            size={16} 
            className={`text-gray-500 transition-transform ${showCategories ? 'rotate-180' : ''}`} 
          />
        </button>

        {showCategories && categories.length > 0 && (
          <div className="px-4 py-2 space-y-2 max-h-64 overflow-y-auto">
             <Input
              type="text"
              placeholder="Filter categories..."
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="mb-2"
            />
            {filteredCategories.map(category => (
              <div 
                key={category}
                className="flex items-center justify-between text-sm"
              >
                <button
                  className={cn(
                    "flex items-center text-left w-full px-2 py-1 rounded hover:bg-gray-50",
                    selectedCategories.includes(category) ? "font-medium text-primary" : "text-gray-700"
                  )}
                  onClick={() => onCategoryChange && onCategoryChange(category)}
                >
                  <span className="truncate">{category}</span>
                </button>
                {selectedCategories.includes(category) && (
                  <CheckSquare size={14} className="text-primary" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
        © {new Date().getFullYear()} Content Analyzer
      </div>
    </div>
  );
}