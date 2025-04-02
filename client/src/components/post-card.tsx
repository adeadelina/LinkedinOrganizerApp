import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CategoryFilter } from "@/components/category-filter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Check, Edit, Eye, Loader2, X } from "lucide-react";
import type { Post } from "@shared/schema";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

interface PostCardProps {
  post: Post;
  onRefetch?: () => void;
}

export function PostCard({ post, onRefetch }: PostCardProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualContent, setManualContent] = useState("");
  const [authorName, setAuthorName] = useState(post.authorName || "");
  
  const isProcessing = post.processingStatus === "processing";
  const isFailed = post.processingStatus === "failed";
  
  // Mutation for manual content submission
  const manualContentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        "POST", 
        `/api/posts/${post.id}/manual-content`, 
        { content: manualContent, authorName }
      );
    },
    onSuccess: () => {
      toast({
        title: "Content updated",
        description: "Your manual content has been processed successfully.",
      });
      setShowManualInput(false);
      if (onRefetch) onRefetch();
    },
    onError: (error) => {
      toast({
        title: "Error updating content",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });
  
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
  
  // Handle manual content submission
  const handleManualContentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualContent.trim().length === 0) {
      toast({
        title: "Error",
        description: "Please enter some content before submitting",
        variant: "destructive",
      });
      return;
    }
    manualContentMutation.mutate();
  };

  return (
    <div className="border-t border-gray-200">
      {showManualInput ? (
        // Manual content entry form
        <div className="px-4 py-4 sm:px-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
            <h3 className="text-md font-semibold text-gray-900">
              Manual Content Entry
            </h3>
            <Button 
              onClick={() => setShowManualInput(false)} 
              variant="ghost" 
              size="sm" 
              className="text-xs h-8 px-2"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
            <h4 className="text-sm font-medium text-blue-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              Instructions for manual content entry
            </h4>
            <p className="mt-1 text-xs text-blue-700">
              1. Visit the LinkedIn post by clicking "View post on LinkedIn" above<br />
              2. Copy the author name and post content<br />
              3. Paste them in the fields below<br />
              4. Our AI will analyze and categorize the content
            </p>
          </div>
          
          <form onSubmit={handleManualContentSubmit} className="space-y-4">
            <div>
              <label htmlFor="authorName" className="block text-sm font-medium text-gray-700 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Author Name
              </label>
              <Input
                id="authorName"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="LinkedIn User"
                className="mt-1"
              />
            </div>
            
            <div>
              <label htmlFor="manualContent" className="block text-sm font-medium text-gray-700 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Post Content
              </label>
              <Textarea
                id="manualContent"
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                placeholder="Paste the LinkedIn post content here..."
                className="mt-1 min-h-[200px]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Make sure to include the full post content for the most accurate categorization
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                type="button"
                onClick={() => setShowManualInput(false)} 
                variant="outline" 
                size="sm"
                disabled={manualContentMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                size="sm"
                disabled={manualContentMutation.isPending}
              >
                {manualContentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Submit
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        // Regular post display
        <div className="px-4 py-4 sm:px-6 border-b border-gray-200">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              {post.authorImage ? (
                <img 
                  src={post.authorImage} 
                  alt={`${post.authorName || 'User'}'s profile`} 
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <span className="inline-block h-10 w-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 font-medium">
                  {post.authorName?.[0] || "U"}
                </span>
              )}
            </div>
            <div className="ml-4 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {post.authorName || "LinkedIn User"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {getTimeElapsed(post.createdAt)}
                  </p>
                </div>
                {!isProcessing && !isFailed && (
                  <div className="flex flex-wrap gap-1">
                    {post.categories?.slice(0, 2).map((category) => (
                      <CategoryFilter key={category} category={category} />
                    ))}
                    {post.categories && post.categories.length > 2 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        +{post.categories.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {isProcessing ? (
            <div className="ml-5 flex-shrink-0 flex items-center space-x-4">
              <div className="flex items-center">
                <div className="h-2 w-2 bg-[#0A66C2] rounded-full animate-pulse mr-2"></div>
                <span className="text-sm text-gray-500">
                  {post.processingStatus === "extracting" ? "Extracting post content from LinkedIn..." : "Processing post content..."}
                </span>
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
                      <p>LinkedIn API extraction failed. This could be due to content protection or API limitations.</p>
                    ) : post.processError?.includes('429') ? (
                      <p>Rate limit exceeded. Please wait a moment and try again.</p>
                    ) : post.processError?.includes('authentication') ? (
                      <p>This LinkedIn post requires authentication or is private. Please try a public post instead.</p>
                    ) : post.processError?.includes('URL') ? (
                      <p>The LinkedIn URL format is invalid or not supported. Please check the URL and try again.</p>
                    ) : (
                      <p>There was an error processing this LinkedIn post: {post.processError || "Unknown error"}.</p>
                    )}
                    
                    <div className="mt-3 p-3 border border-yellow-300 bg-yellow-50 rounded-md">
                      <h4 className="font-medium text-yellow-800">Solution: Manual Entry Available</h4>
                      <p className="mt-1 text-sm text-yellow-700">
                        You can manually enter the content from this LinkedIn post for AI analysis and categorization.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                          View post on LinkedIn
                        </a>
                        <Button 
                          onClick={() => setShowManualInput(true)} 
                          size="sm"
                          className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" />
                          Enter content manually
                        </Button>
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
                  onClick={toggleExpand}
                  className="text-[#0A66C2] hover:text-blue-700 font-medium text-sm"
                >
                  Read more...
                </button>
              )}
              
              {expanded && (
                <button 
                  onClick={toggleExpand}
                  className="text-[#0A66C2] hover:text-blue-700 font-medium text-sm"
                >
                  Show less
                </button>
              )}
            </div>
          )}
          
          {!isProcessing && !isFailed && (
            <div className="mt-4 flex justify-between">
              <div className="flex items-center text-gray-500 text-xs flex-wrap gap-1">
                {post.categories?.map((category) => (
                  <CategoryFilter key={category} category={category} />
                ))}
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => setShowManualInput(true)}
                >
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  Edit
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
          )}
        </div>
      )}
    </div>
  );
}