import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { isValidLinkedInUrl } from "@/lib/utils";
import { Post } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface PostInputProps {
  onAnalyzed?: (post: Post) => void;
}

export function PostInput({ onAnalyzed }: PostInputProps) {
  const [url, setUrl] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Mutation for analyzing LinkedIn posts
  const analyzeMutation = useMutation({
    mutationFn: async (postUrl: string) => {
      const res = await apiRequest("POST", "/api/analyze", { url: postUrl });
      return res.json();
    },
    onSuccess: (data: Post) => {
      // Invalidate posts cache to trigger a refresh
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      
      // Clear the input field
      setUrl("");
      
      // Call onAnalyzed callback if provided
      if (onAnalyzed) {
        onAnalyzed(data);
      }
      
      // Show success toast
      toast({
        title: "Post added for analysis",
        description: "The LinkedIn post is being processed.",
      });
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: "Failed to analyze post",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate URL
    if (!url.trim()) {
      toast({
        title: "URL is required",
        description: "Please enter a LinkedIn post URL.",
        variant: "destructive",
      });
      return;
    }
    
    if (!isValidLinkedInUrl(url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid LinkedIn post URL.",
        variant: "destructive",
      });
      return;
    }
    
    // Submit for analysis
    analyzeMutation.mutate(url);
  };

  return (
    <div className="mt-6">
      <h2 className="text-lg font-medium mb-3">Analyze LinkedIn post</h2>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
        <div className="flex-grow">
          <label htmlFor="linkedin-url" className="block text-sm font-medium text-gray-700 mb-1">
            LinkedIn Post URL
          </label>
          <Input
            id="linkedin-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.linkedin.com/posts/..."
            className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
            disabled={analyzeMutation.isPending}
          />
        </div>
        <div className="flex items-end">
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
            disabled={analyzeMutation.isPending}
          >
            {analyzeMutation.isPending ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Processing...
              </>
            ) : (
              <>Extract & Categorize</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
