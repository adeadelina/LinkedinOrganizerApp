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
}

const SidebarItem = ({ href, icon, label, count, active }: SidebarItemProps) => {
  return (
    <Link href={href}>
      <a
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
      </a>
    </Link>
  );
};

export function Sidebar({ categories = [], selectedCategories = [], onCategoryChange, onSearch }: SidebarProps) {
  const [location] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState<"all" | "keyword" | "author">("all");
  const [showFilters, setShowFilters] = useState(true);
  const [showCategories, setShowCategories] = useState(true);

  const handleSearch = () => {
    if (onSearch) {
      onSearch(searchTerm, searchBy);
    }
  };

  return (
    <div className="bg-white w-60 min-h-screen border-r border-gray-100 py-4 flex flex-col">
      <div className="px-4 mb-6">
        <h1 className="text-xl font-semibold text-gray-800">
          <span className="text-primary">content</span> analyzer
        </h1>
      </div>



      <div className="mb-4">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50"
        >
          <span className="text-sm font-medium flex items-center">
            <Bookmark size={16} className="mr-2 text-primary" />
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
              count={100}
            />
            <SidebarItem 
              href="/archive" 
              icon={<Archive size={16} />} 
              label="Archive" 
            />
            <SidebarItem 
              href="/unread" 
              icon={<Eye size={16} />} 
              label="Unread" 
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
            {categories.map(category => (
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

      {/* Sources section */}
      <div className="mb-4">
        <button className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50">
          <span className="text-sm font-medium flex items-center">
            <Database size={16} className="mr-2 text-primary" />
            Sources
          </span>
          <ChevronDown size={16} className="text-gray-500" />
        </button>
      </div>

      <div className="mt-auto px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
        © {new Date().getFullYear()} Content Analyzer
      </div>
    </div>
  );
}