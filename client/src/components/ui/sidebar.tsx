import { useState } from "react";
import { LayoutDashboard, PlusCircle, Search, Filter } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

interface SidebarProps {
  className?: string;
  categories: string[];
  selectedCategories: string[];
  onCategoryChange: (category: string) => void;
}

export function Sidebar({ 
  className, 
  categories = [], 
  selectedCategories = [],
  onCategoryChange 
}: SidebarProps) {
  const [location] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  
  const filteredCategories = searchTerm
    ? categories.filter(category => 
        category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : categories;
  
  const displayedCategories = showAllCategories 
    ? filteredCategories
    : filteredCategories.slice(0, 10);

  const isActive = (path: string) => location === path;
  
  return (
    <div className={cn("hidden md:flex md:flex-shrink-0", className)}>
      <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
        <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-md bg-[#0A66C2] flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-gray-900">LinkedIn Analyzer</h1>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col overflow-y-auto pt-3">
          <nav className="flex-1 px-2 space-y-1">
            {/* Dashboard Link */}
            <Link href="/">
              <a className={cn(
                "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                isActive("/") 
                  ? "bg-[#EEF3F8] text-[#0A66C2]" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}>
                <LayoutDashboard className="mr-3 h-5 w-5" />
                Dashboard
              </a>
            </Link>
            
            {/* Import Posts Link */}
            <Link href="/import">
              <a className={cn(
                "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                isActive("/import") 
                  ? "bg-[#EEF3F8] text-[#0A66C2]" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}>
                <PlusCircle className="mr-3 h-5 w-5 text-gray-400" />
                Import Posts
              </a>
            </Link>
          
            {/* Search Box */}
            <div className="px-2 pt-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search posts..."
                  className="block w-full pl-10 pr-3 py-2"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {/* Filters Section */}
            <div className="pt-3">
              <div className="flex items-center px-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <h3 className="ml-2 text-sm font-medium text-gray-500">Filters</h3>
              </div>
            </div>
            
            {/* Categories Section */}
            <div className="pt-2 pb-1">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Categories
              </h3>
              <div className="mt-2 space-y-1">
                {displayedCategories.map((category) => (
                  <label 
                    key={category} 
                    className={cn(
                      "flex items-center px-3 py-1.5 text-sm rounded-md cursor-pointer",
                      selectedCategories.includes(category) 
                        ? "bg-[#EEF3F8] text-[#0A66C2] font-medium" 
                        : "hover:bg-gray-50"
                    )}
                  >
                    <Checkbox 
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() => onCategoryChange(category)}
                      className={cn(
                        "h-4 w-4 rounded border-gray-300",
                        selectedCategories.includes(category) 
                          ? "text-[#0A66C2] border-[#0A66C2]" 
                          : "text-gray-400"
                      )}
                    />
                    <span className={cn(
                      "ml-2 text-sm",
                      selectedCategories.includes(category) 
                        ? "text-[#0A66C2] font-medium" 
                        : "text-gray-700"
                    )}>
                      {category}
                    </span>
                    {selectedCategories.includes(category) && (
                      <span className="ml-auto px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Active
                      </span>
                    )}
                  </label>
                ))}
                
                {filteredCategories.length > 10 && (
                  <button 
                    onClick={() => setShowAllCategories(!showAllCategories)}
                    className="w-full flex items-center px-3 py-1 text-sm text-gray-500 hover:text-[#0A66C2]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showAllCategories ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                    </svg>
                    {showAllCategories ? "View less" : "View more"}
                  </button>
                )}
              </div>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
