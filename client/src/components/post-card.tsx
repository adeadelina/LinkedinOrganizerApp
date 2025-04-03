import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryFilter } from "@/components/category-filter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Check, Eye, Loader2, Tag, Plus, Edit2, X, Trash2, AlertTriangle } from "lucide-react";
import type { Post } from "@shared/schema";
import { MAX_CATEGORIES_PER_POST } from "@shared/schema";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PostCardProps {
  post: Post;
  onRefetch?: () => void;
}

export function PostCard({ post, onRefetch }: PostCardProps) {
  // Log each post as it's rendered
  console.log(`Rendering post ${post.id}:`, {
    id: post.id,
    url: post.url,
    hasContent: Boolean(post.content),
    categories: post.categories,
    author: post.authorName,
    processingStatus: post.processingStatus
  });
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(post.categories || []);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  
  // State for new category input, delete confirmation, and full post view
  const [newCategory, setNewCategory] = useState("");
  const [newCategories, setNewCategories] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFullPostDialogOpen, setIsFullPostDialogOpen] = useState(false);
  
  // Fetch available categories
  const { 
    data: availableCategories = [],
    refetch: refetchAvailableCategories
  } = useQuery<string[]>({
    queryKey: ['/api/categories'],
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
  
  // Update post categories after state changes
  useEffect(() => {
    if (post.categories) {
      setSelectedCategories(post.categories);
    }
  }, [post.categories]);
  
  const isProcessing = post.processingStatus === "processing";
  const isFailed = post.processingStatus === "failed";
  
  // Mutation for re-extracting author information
  const reExtractAuthorMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        `/api/posts/${post.id}/reextract-author`,
        { 
          method: "POST",
          headers: { "Content-Type": "application/json" }
        }
      );
    },
    onSuccess: (data) => {
      toast({
        title: "Author information updated",
        description: "The author's name and image have been successfully updated.",
      });
      
      // Refresh the posts data to reflect the changes
      queryClient.invalidateQueries({ 
        queryKey: ['/api/posts'],
        refetchType: 'active',
      });
      
      // Refresh parent component
      if (onRefetch) onRefetch();
    },
    onError: (error) => {
      toast({
        title: "Error updating author information",
        description: error instanceof Error 
          ? error.message 
          : "Could not extract author information from the LinkedIn post.",
        variant: "destructive",
      });
    }
  });

  // Mutation for deleting a post
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
      
      // Refresh all posts data
      queryClient.invalidateQueries({ 
        queryKey: ['/api/posts'],
        refetchType: 'active',
      });
      
      // Refresh parent component
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
      // Deduplicate before sending to server
      const uniqueSelectedCategories = selectedCategories.filter((category, index, self) => 
        self.indexOf(category) === index
      );
      const uniqueNewCategories = newCategories.filter((category, index, self) => 
        self.indexOf(category) === index
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
      
      // Refresh all data that depends on categories with immediate refetching
      queryClient.invalidateQueries({ 
        queryKey: ['/api/categories'],
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/posts'],
        refetchType: 'active',
      });
      
      // Force multiple refreshes to ensure we get the latest data
      setTimeout(() => {
        // First immediate refresh
        refetchAvailableCategories()
          .then(() => {
            console.log("Categories refreshed successfully");
            // Second refresh after a short delay
            setTimeout(() => {
              refetchAvailableCategories();
              if (onRefetch) onRefetch();
            }, 500);
          });
      }, 100);
      
      // Refresh parent component
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
  
  // Handle category selection change
  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };
  
  // Handle save categories
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
  
  // Format the time elapsed since post was created
  const getTimeElapsed = (date?: Date | string | null) => {
    if (!date) return "less than a minute ago";
    
    const then = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 1) return "less than a minute ago";
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  };
  
  // Toggle expand/collapse of post content
  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <div className="border-t border-gray-200">
      <div 
        className="px-4 py-4 sm:px-6 border-b border-gray-200 relative cursor-pointer"
        onClick={(e) => {
          // Only open the full post dialog if not clicking on a button or category tag
          const target = e.target as HTMLElement;
          const isButton = target.closest('button') || target.closest('a');
          const isCategoryTag = target.closest('.category-tag');
          const isDialog = target.closest('[role="dialog"]');
          
          // Debug what is being clicked
          console.log("Element clicked:", target.tagName, target.className);
          
          // Always open the dialog for completed posts
          if (!isButton && !isCategoryTag && !isDialog && !isProcessing && !isFailed) {
            console.log("Opening dialog for post:", post.id);
            setIsFullPostDialogOpen(true);
          }
        }}
      >
        {/* Content that should be clickable */}
        <div className="relative cursor-pointer">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              {post.authorImage ? (
                <img 
                  src={post.authorImage} 
                  alt={`${post.authorName || (post.url?.includes("linkedin.com") ? "LinkedIn Author" : "Content Author")}'s profile`} 
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <span className="inline-block h-10 w-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 font-medium">
                  {(post.authorName && post.authorName !== "LinkedIn User") 
                    ? post.authorName[0]
                    : (post.url?.includes("linkedin.com") ? "L" : "U")}
                </span>
              )}
            </div>
            <div className="ml-4 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {post.authorName && post.authorName !== "LinkedIn User" 
                      ? post.authorName 
                      : post.url?.includes("linkedin.com") 
                        ? "LinkedIn Author" 
                        : "Content Author"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {getTimeElapsed(post.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {isProcessing ? (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="mr-3 flex-shrink-0 bg-blue-100 rounded-full p-1">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-800">
                    {post.processingStatus === "extracting" 
                      ? "Extracting content..." 
                      : post.processingStatus === "analyzing" 
                        ? "Analyzing content..." 
                        : "Processing content..."}
                  </h3>
                  <p className="mt-1 text-xs text-blue-600">
                    Please wait while we process your content. This may take a few moments.
                  </p>
                </div>
              </div>
              <div className="ml-auto flex items-center space-x-1">
                <span className="inline-block h-2 w-2 bg-blue-600 rounded-full animate-ping"></span>
                <span className="inline-block h-2 w-2 bg-blue-600 rounded-full animate-pulse animation-delay-200"></span>
                <span className="inline-block h-2 w-2 bg-blue-600 rounded-full animate-ping animation-delay-500"></span>
              </div>
            </div>
          ) : isFailed ? (
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Processing failed</h3>
                  <div className="mt-2 text-sm text-red-700">
                    {post.processError?.includes('422') ? (
                      <p>Content extraction failed. This could be due to content protection or API limitations.</p>
                    ) : post.processError?.includes('429') ? (
                      <p>Rate limit exceeded. Please wait a moment and try again.</p>
                    ) : post.processError?.includes('authentication') ? (
                      <p>This content requires authentication or is private. Please try public content instead.</p>
                    ) : post.processError?.includes('URL') ? (
                      <p>The URL format is invalid or not supported. Please check the URL and try again.</p>
                    ) : (
                      <p>There was an error processing this content: {post.processError || "Unknown error"}.</p>
                    )}
                    
                    <div className="mt-3 p-3 border border-yellow-300 bg-yellow-50 rounded-md">
                      <h4 className="font-medium text-yellow-800">Failed to extract content</h4>
                      <p className="mt-1 text-sm text-yellow-700">
                        Please try a different URL or check the source is accessible.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center">
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View original content
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-1 text-sm text-gray-700 space-y-2">
              {post.content?.split('\n').map((paragraph, i) => (
                paragraph ? <p key={i}>{paragraph}</p> : <br key={i} />
              )).slice(0, expanded ? undefined : 5)}
              
              {!expanded && post.content && post.content.split('\n').length > 5 && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent the full post dialog from opening
                    toggleExpand();
                  }}
                  className="text-[#0A66C2] hover:text-blue-700 font-medium text-sm"
                >
                  Read more...
                </button>
              )}
              
              {expanded && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent the full post dialog from opening
                    toggleExpand();
                  }}
                  className="text-[#0A66C2] hover:text-blue-700 font-medium text-sm"
                >
                  Show less
                </button>
              )}
            </div>
          )}
        </div>
        
        {!isProcessing && !isFailed && (
          <div className="mt-4 flex flex-col space-y-3">
            {/* Category section header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {/* Categories label and inline edit button removed */}
              </div>
              
              <div className="flex items-center space-x-2">
                <Button 
                  id={`edit-categories-${post.id}`}
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => setIsCategoryDialogOpen(true)}
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1" />
                  Edit Categories
                </Button>

                <Button 
                  id={`delete-post-${post.id}`}
                  variant="outline" 
                  size="sm" 
                  className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
                
                <a 
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block"
                >
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-[#0A66C2] bg-[#EEF3F8] hover:bg-blue-50"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    View
                  </Button>
                </a>
              </div>
            </div>
            
            {/* Category badges */}
            <div className="flex items-center text-gray-500 text-xs flex-wrap gap-1">
              {post.categories && post.categories.length > 0 ? (
                // Remove duplicate categories
                post.categories.filter((category, index, self) => 
                  self.indexOf(category) === index
                ).map((category) => (
                  <CategoryFilter 
                    key={category} 
                    category={category}
                    onClick={() => {}}
                    className="category-tag" // Add a class to identify category tags
                  />
                ))
              ) : (
                <div className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 category-tag">
                  <Tag className="h-3 w-3 mr-1" />
                  No categories assigned
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Category Edit Dialog */}
        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Manage Categories</DialogTitle>
              <DialogDescription>
                Select the categories that best match this post's content.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto p-2">
                {availableCategories.map((category: string) => (
                  <div key={category} className="flex items-center space-x-2 border rounded p-2">
                    <Checkbox 
                      id={`category-${category}`} 
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() => handleCategoryChange(category)}
                      disabled={
                        !selectedCategories.includes(category) && 
                        selectedCategories.length >= MAX_CATEGORIES_PER_POST
                      }
                    />
                    <label 
                      htmlFor={`category-${category}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      {category}
                    </label>
                    {selectedCategories.includes(category) && (
                      <Badge variant="secondary" className="ml-auto">Selected</Badge>
                    )}
                  </div>
                ))}

                {/* New categories section */}
                {newCategories.length > 0 && (
                  <div className="mt-2 border-t pt-3">
                    <h4 className="text-sm font-medium mb-2">Your new categories:</h4>
                    {newCategories.map((category, index) => (
                      <div key={`new-${index}`} className="flex items-center space-x-2 border rounded p-2 mb-2 bg-green-50">
                        <Checkbox 
                          id={`category-new-${index}`} 
                          checked={selectedCategories.includes(category)}
                          onCheckedChange={() => handleCategoryChange(category)}
                          disabled={
                            !selectedCategories.includes(category) && 
                            selectedCategories.length >= MAX_CATEGORIES_PER_POST
                          }
                        />
                        <label 
                          htmlFor={`category-new-${index}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {category}
                        </label>
                        <Badge variant="outline" className="bg-green-100">New</Badge>
                        {selectedCategories.includes(category) && (
                          <Badge variant="secondary" className="ml-1">Selected</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Add new category input */}
              <div className="mt-4 mb-2">
                <h4 className="text-sm font-medium mb-2">Add a new category:</h4>
                <div className="flex gap-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Enter new category"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    size="sm"
                    onClick={() => {
                      if (newCategory.trim()) {
                        // Add to new categories list
                        setNewCategories(prev => [...prev, newCategory.trim()]);
                        // Also select it
                        if (selectedCategories.length < MAX_CATEGORIES_PER_POST) {
                          setSelectedCategories(prev => [...prev, newCategory.trim()]);
                        }
                        // Clear input
                        setNewCategory('');
                      }
                    }}
                    disabled={!newCategory.trim()}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-4">
                <p className="text-xs text-amber-800">
                  Selected categories: {selectedCategories.length ? 
                    selectedCategories.join(', ') : 
                    'None (please select at least one)'}
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  {selectedCategories.length}/{MAX_CATEGORIES_PER_POST} maximum categories used
                </p>
              </div>
            </div>
            <DialogFooter className="sm:justify-between">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedCategories(post.categories || []);
                  setNewCategories([]);
                  setNewCategory('');
                  setIsCategoryDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                size="sm"
                onClick={handleSaveCategories}
                disabled={updateCategoriesMutation.isPending || selectedCategories.length === 0}
              >
                {updateCategoriesMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center text-red-600">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Delete Post
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this post? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {/* Post preview has been removed as requested */}
            <DialogFooter className="sm:justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => deletePostMutation.mutate()}
                disabled={deletePostMutation.isPending}
              >
                {deletePostMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete Post
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Full Post Dialog */}
        <Dialog open={isFullPostDialogOpen} onOpenChange={setIsFullPostDialogOpen}>
          <DialogContent className="sm:max-w-[680px]">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                {post.authorImage && (
                  <img 
                    src={post.authorImage} 
                    alt={`${post.authorName || 'Author'}'s profile`}
                    className="h-8 w-8 rounded-full mr-2"
                  />
                )}
                {post.authorName || 'Post Content'}
              </DialogTitle>
              <DialogDescription>
                {post.url}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 max-h-[70vh] overflow-y-auto">
              <div className="text-sm text-gray-700 space-y-3">
                {post.content ? (
                  post.content.split('\n').map((paragraph, i) => (
                    paragraph ? <p key={i} className="mb-2">{paragraph}</p> : <br key={i} />
                  ))
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-amber-800 flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      This post doesn't have content available for display.
                    </p>
                    <p className="text-amber-700 mt-2 text-sm">
                      This might be because the post was imported without content extraction 
                      or there was an issue during content extraction.
                    </p>
                    <p className="text-amber-700 mt-2 text-sm">
                      You can still view the original content at the source by clicking "View Original" below.
                    </p>
                  </div>
                )}
              </div>
              
              {post.categories && post.categories.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium mb-2">Categories:</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {post.categories.map(category => (
                      <Badge key={category} variant="outline" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block ml-auto"
              >
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-[#0A66C2] bg-[#EEF3F8] hover:bg-blue-50"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  View Original
                </Button>
              </a>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}