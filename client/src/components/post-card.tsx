
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
import { Card } from "@/components/ui/card";

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
    <Card className="mb-4 overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <div className="p-6">
        <div 
          className="relative cursor-pointer"
          onClick={() => {
            if (!isProcessing && !isFailed && post.content) {
              setIsFullPostDialogOpen(true);
            }
          }}
        >
          <div className="flex items-center mb-6">
            <div className="flex-shrink-0">
              {post.authorImage ? (
                <img 
                  src={post.authorImage} 
                  alt={`${post.authorName || 'Author'}'s profile`} 
                  className="h-12 w-12 rounded-full border-2 border-gray-100"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center border-2 border-gray-100">
                  <span className="text-blue-600 font-semibold text-lg">
                    {post.authorName?.[0] || 'U'}
                  </span>
                </div>
              )}
            </div>
            <div className="ml-4 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {post.authorName || 'Unknown Author'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {getTimeElapsed(post.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-gray-700 space-y-3 leading-relaxed">
            {post.content?.split('\n').map((paragraph, i) => (
              paragraph ? <p key={i} className="text-base">{paragraph}</p> : <br key={i} />
            )).slice(0, expanded ? undefined : 5)}

            {!expanded && post.content && post.content.split('\n').length > 5 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand();
                }}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm mt-2 transition-colors duration-200"
              >
                Read more...
              </button>
            )}

            {expanded && post.postImage && (
              <div className="mt-6">
                <img src={post.postImage} alt="Post content" className="w-full rounded-lg shadow-md" />
              </div>
            )}

            {expanded && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand();
                }}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm mt-2 transition-colors duration-200"
              >
                Show less
              </button>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {post.categories?.map((category) => (
              <CategoryFilter 
                key={category}
                category={category}
                onClick={() => {}}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-gray-50"
            onClick={() => setIsCategoryDialogOpen(true)}
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Categories
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>

          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="sm" className="hover:bg-blue-50">
              <Eye className="h-4 w-4 mr-2" />
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
                paragraph ? <p key={i} className="mb-3 text-base leading-relaxed">{paragraph}</p> : <br key={i} />
              ))}
              {post.postImage && (
                <div className="mt-6">
                  <img src={post.postImage} alt="Post content" className="w-full rounded-lg shadow-md" />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Categories</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-3">
                {availableCategories.map((category) => (
                  <div key={category} className="flex items-center space-x-3">
                    <Checkbox
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() => handleCategoryChange(category)}
                    />
                    <label className="text-sm">{category}</label>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Add new category"
                  className="mb-2"
                />
                <Button
                  onClick={() => {
                    if (newCategory) {
                      setNewCategories([...newCategories, newCategory]);
                      setSelectedCategories([...selectedCategories, newCategory]);
                      setNewCategory('');
                    }
                  }}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
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
    </Card>
  );
}
