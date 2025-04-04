import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryFilter } from "@/components/category-filter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Check, Eye, Loader2, Tag, Plus, Edit2, Trash2, AlertTriangle } from "lucide-react";
import type { Post } from "@shared/schema";
import { MAX_CATEGORIES_PER_POST } from "@shared/schema";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface PostCardProps {
  post: Post;
  onRefetch?: () => void;
}

export function PostCard({ post, onRefetch }: PostCardProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(post.categories || []);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isFullPostDialogOpen, setIsFullPostDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newCategories, setNewCategories] = useState<string[]>([]);

  const { 
    data: availableCategories = [],
    refetch: refetchAvailableCategories
  } = useQuery<string[]>({
    queryKey: ['/api/categories'],
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (post.categories) {
      setSelectedCategories(post.categories);
    }
  }, [post.categories]);

  const isProcessing = post.processingStatus === "processing";
  const isFailed = post.processingStatus === "failed";

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
      const uniqueSelectedCategories = [...new Set(selectedCategories)];
      const uniqueNewCategories = [...new Set(newCategories)];

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

      setTimeout(() => {
        refetchAvailableCategories()
          .then(() => {
            setTimeout(() => {
              refetchAvailableCategories();
              if (onRefetch) onRefetch();
            }, 500);
          });
      }, 100);

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

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <div className="border-t border-gray-200">
      <div className="px-4 py-4 sm:px-6 border-b border-gray-200">
        <div 
          className="relative cursor-pointer"
          onClick={() => {
            if (!isProcessing && !isFailed && post.content) {
              setIsFullPostDialogOpen(true);
            }
          }}
        >
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              {post.authorImage ? (
                <img 
                  src={post.authorImage} 
                  alt={`${post.authorName || 'Author'}'s profile`} 
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 font-medium">
                    {post.authorName?.[0] || 'U'}
                  </span>
                </div>
              )}
            </div>
            <div className="ml-4 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {post.authorName || 'Unknown Author'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {getTimeElapsed(post.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-1 text-sm text-gray-700 space-y-2">
            {post.content?.split('\n').map((paragraph, i) => (
              paragraph ? <p key={i}>{paragraph}</p> : <br key={i} />
            )).slice(0, expanded ? undefined : 5)}

            {expanded && post.postImage && (
              <div className="mt-4">
                <img src={post.postImage} alt="Post content" className="max-w-full rounded-lg" />
              </div>
            )}

            {!expanded && post.content && post.content.split('\n').length > 5 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand();
                }}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Read more...
              </button>
            )}

            {expanded && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand();
                }}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Show less
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {post.categories?.map((category) => (
              <CategoryFilter 
                key={category}
                category={category}
                onClick={() => {}}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCategoryDialogOpen(true)}
          >
            <Edit2 className="h-4 w-4 mr-1" />
            Edit Categories
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-red-600"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>

          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              View Original
            </Button>
          </a>
        </div>

        <Dialog open={isFullPostDialogOpen} onOpenChange={setIsFullPostDialogOpen}>
          <DialogContent className="sm:max-w-[680px]">
            <DialogHeader>
              <DialogTitle>
                {post.authorName || 'Post Content'}
              </DialogTitle>
              <DialogDescription>
                {post.url}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 max-h-[70vh] overflow-y-auto">
              {post.content?.split('\n').map((paragraph, i) => (
                paragraph ? <p key={i} className="mb-2">{paragraph}</p> : <br key={i} />
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Categories</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                {availableCategories.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() => handleCategoryChange(category)}
                    />
                    <label>{category}</label>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Add new category"
                />
                <Button
                  className="mt-2"
                  onClick={() => {
                    if (newCategory) {
                      setNewCategories([...newCategories, newCategory]);
                      setSelectedCategories([...selectedCategories, newCategory]);
                      setNewCategory('');
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Category
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCategories}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
              >
                Delete Post
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}