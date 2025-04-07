import React from "react";
import { Search, Plus, Settings, Download, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/user-context";

interface HeaderProps {
  title: string;
  onNewPostClick?: () => void;
}

export function Header({ title, onNewPostClick }: HeaderProps) {
  const { user } = useUser();
  
  return (
    <div className="bg-white border-b border-gray-200 py-3 px-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            type="search" 
            placeholder="Search posts..." 
            className="pl-9 w-60 h-9"
          />
        </div>
        
        <Button size="sm" variant="outline" onClick={onNewPostClick}>
          <Plus className="h-4 w-4 mr-1" />
          New Link
        </Button>
        
        <Button size="sm" variant="ghost">
          <Settings className="h-4 w-4" />
        </Button>
        
        <Button size="sm" variant="ghost">
          <Download className="h-4 w-4" />
        </Button>
        
        <div className="ml-2 flex items-center">
          {user?.picture ? (
            <img 
              src={user.picture} 
              alt={user.name || user.username} 
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <UserCircle className="h-8 w-8 text-gray-400" />
          )}
        </div>
      </div>
    </div>
  );
}