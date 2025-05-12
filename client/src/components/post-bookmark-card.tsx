import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  Star, MoreHorizontal, ExternalLink, Trash2, Pencil, Tag, 
  Edit2, CheckSquare, Calendar, ClipboardCheck
} from "lucide-react";
import { CategoryFilter } from "@/components/category-filter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatRelativeTime, truncateText } from "@/lib/utils";
import type { Post } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { MAX_CATEGORIES_PER_POST } from "@shared/schema";

interface PostBookmarkCardProps {
  post: Post;
  onRefetch?: () => void;
  isSelected?: boolean;
  onSelect?: (id: number) => void;
  className?: string;
}

export function PostBookmarkCard({ post, onRefetch, isSelected, onSelect, className = "" }: PostBookmarkCardProps) {
  const { toast } = useToast();
  const [isFullPostDialogOpen, setIsFullPostDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(post.categories || []);
  const [newCategory, setNewCategory] = useState("");
  const [newCategories, setNewCategories] = useState<string[]>([]);
  
  // Fetch all categories
  const { data: availableCategories = [] } = useQuery<string[]>({
    queryKey: ['/api/categories'],
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  
  const deletePostMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        `/api/posts/${post.id}`,
        { 
          method: "DELETE",
          headers: { "Content-Type": "application/json" }
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Post deleted",
        description: "The post has been successfully deleted.",
      });
      setIsDeleteDialogOpen(false);
      
      queryClient.invalidateQueries({ 
        queryKey: ['/api/posts'],
        refetchType: 'active',
      });
      
      if (onRefetch) onRefetch();
    },
    onError: (error) => {
      toast({
        title: "Error deleting post",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
    }
  });
  
  const updateCategoriesMutation = useMutation({
    mutationFn: async () => {
      // Create unique arrays without using Sets to avoid TypeScript issues
      const uniqueSelectedCategories = selectedCategories.filter(
        (category, index) => selectedCategories.indexOf(category) === index
      );
      const uniqueNewCategories = newCategories.filter(
        (category, index) => newCategories.indexOf(category) === index
      );

      return apiRequest(
        `/api/posts/${post.id}/update-categories`,
        { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categories: uniqueSelectedCategories,
            newCategories: uniqueNewCategories 
          })
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Categories updated",
        description: "The post categories have been successfully updated.",
      });
      setIsCategoryDialogOpen(false);
      setNewCategories([]);

      queryClient.invalidateQueries({ 
        queryKey: ['/api/categories'],
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/posts'],
        refetchType: 'active',
      });

      if (onRefetch) onRefetch();
    },
    onError: (error) => {
      toast({
        title: "Error updating categories",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });

  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else {
        // Check if we're at the maximum number of categories
        if (prev.length >= MAX_CATEGORIES_PER_POST) {
          toast({
            title: "Maximum categories reached",
            description: `You can only select up to ${MAX_CATEGORIES_PER_POST} categories per post.`,
            variant: "destructive",
          });
          return prev;
        }
        return [...prev, category];
      }
    });
  };

  const handleSaveCategories = () => {
    if (selectedCategories.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one category",
        variant: "destructive",
      });
      return;
    }
    updateCategoriesMutation.mutate();
  };
  
  const isProcessing = post.processingStatus === "processing";
  const isFailed = post.processingStatus === "failed";
  
  // Get the first sentence of content for headline
  const getHeadline = (content: string | null) => {
    if (!content) return "";
    const firstSentence = content.split(/(?<=[.!?])\s+/)[0];
    return truncateText(firstSentence, 80);
  };
  
  return (
    <div 
      className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden transition-all hover:shadow-md h-full flex flex-col ${
        isSelected ? 'ring-2 ring-primary' : 'hover:border-gray-300'
      } ${className}`}
      onClick={() => {
        if (!isProcessing && !isFailed && onSelect) {
          onSelect(post.id);
        }
      }}
    >
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex flex-col">
          {/* Author row */}
          <div className="flex items-center gap-3 mb-3">
            {onSelect && (
              <Checkbox 
                checked={isSelected} 
                onCheckedChange={() => onSelect(post.id)} 
                className="h-4 w-4"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            
            {post.authorImage ? (
              <img 
                src={post.authorImage} 
                alt={post.authorName || 'Author'}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500 font-medium text-sm">
                  {post.authorName?.[0] || '?'}
                </span>
              </div>
            )}
            
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium text-sm truncate">
                  {post.authorName || 'Unknown Author'}
                </h3>
                <div className="flex items-center gap-1 shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4 text-gray-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        setIsFullPostDialogOpen(true);
                      }}>
                        <ClipboardCheck className="h-4 w-4 mr-2" />
                        View Full Post
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        window.open(post.url, "_blank");
                      }}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Original
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        setIsCategoryDialogOpen(true);
                      }}>
                        <Tag className="h-4 w-4 mr-2" />
                        Edit Categories
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDeleteDialogOpen(true);
                        }} 
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="text-xs text-gray-500 flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {formatRelativeTime(post.createdAt || new Date())}
              </div>
            </div>
          </div>
          
          {/* Content section */}
          <div>
            {isProcessing ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm">Processing content...</p>
                </div>
              </div>
            ) : isFailed ? (
              <div className="flex items-center justify-center py-8 text-red-500">
                <div className="text-center">
                  <p>Processing failed</p>
                  <p className="text-sm">{post.processError || "Unknown error"}</p>
                </div>
              </div>
            ) : (
              <>
                <h3 className="font-medium text-sm mb-2 line-clamp-1">
                  {getHeadline(post.content)}
                </h3>
                
                <p className="text-sm text-gray-700 line-clamp-3 mb-2">
                  {truncateText(post.content || "", 180)}
                </p>
                
                {post.postImage && (
                  <div className="mt-2 mb-2">
                    <img 
                      src={post.postImage} 
                      alt="Post image" 
                      className="w-full h-32 object-cover rounded-md" 
                    />
                  </div>
                )}
                
                {post.summary && (
                  <div className="mt-2 mb-2 p-2 bg-gray-50 rounded-md text-sm text-gray-600">
                    <p className="font-medium text-xs text-gray-500 mb-1">Summary:</p>
                    <p className="text-xs line-clamp-2">{post.summary}</p>
                  </div>
                )}
                
                {/* Categories */}
                <div className="mt-2">
                  <div className="overflow-x-auto pb-1">
                    <div className="flex flex-wrap gap-1">
                      {post.categories?.slice(0, 3).map(category => (
                        <CategoryFilter
                          key={category}
                          category={category}
                          onClick={(e?: React.MouseEvent) => {
                            if (e) e.stopPropagation();
                          }}
                          className="text-xs"
                        />
                      ))}
                      {post.categories && post.categories.length > 3 && (
                        <span className="text-xs text-gray-500 py-1">
                          +{post.categories.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* URL */}
                <div className="mt-2 text-xs text-gray-500 truncate">
                  <a 
                    href={post.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {post.url}
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Full Post Dialog */}
      <Dialog open={isFullPostDialogOpen} onOpenChange={setIsFullPostDialogOpen}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {post.authorImage && (
                <img 
                  src={post.authorImage} 
                  alt={post.authorName || 'Author'} 
                  className="h-8 w-8 rounded-full"
                />
              )}
              <span>{post.authorName || 'Post Content'}</span>
            </DialogTitle>
            <DialogDescription>
              <a href={post.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {post.url}
              </a>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[70vh] overflow-y-auto">
            {post.content?.split('\n').map((paragraph, i) => (
              paragraph ? <p key={i} className="mb-3">{paragraph}</p> : <br key={i} />
            ))}
            {post.postImage && (
              <div className="mt-4">
                <img src={post.postImage} alt="Post content" className="max-w-full rounded-lg" />
              </div>
            )}
            {post.summary && (
              <div className="mt-6 p-4 bg-gray-50 rounded-md border border-gray-100">
                <h4 className="font-medium text-sm mb-2">Summary:</h4>
                <p className="text-sm text-gray-700">{post.summary}</p>
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-1">
              {post.categories?.map(category => (
                <CategoryFilter
                  key={category}
                  category={category}
                  onClick={() => {}}
                />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Categories Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Categories</DialogTitle>
            <DialogDescription>
              Select categories for this post. You can add up to {MAX_CATEGORIES_PER_POST} categories.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableCategories.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedCategories.includes(category)}
                    onCheckedChange={() => handleCategoryChange(category)}
                    id={`category-${category}`}
                  />
                  <label 
                    htmlFor={`category-${category}`}
                    className="text-sm cursor-pointer"
                  >
                    {category}
                  </label>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Add new category:</p>
              <div className="flex gap-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New category name"
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (newCategory.trim()) {
                      // Check max categories limit
                      if (selectedCategories.length >= MAX_CATEGORIES_PER_POST) {
                        toast({
                          title: "Maximum categories reached",
                          description: `You can only select up to ${MAX_CATEGORIES_PER_POST} categories per post.`,
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      setNewCategories([...newCategories, newCategory.trim()]);
                      setSelectedCategories([...selectedCategories, newCategory.trim()]);
                      setNewCategory('');
                    }
                  }}
                  disabled={!newCategory.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveCategories}
              disabled={updateCategoriesMutation.isPending}
            >
              {updateCategoriesMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletePostMutation.mutate()}
              disabled={deletePostMutation.isPending}
            >
              {deletePostMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}