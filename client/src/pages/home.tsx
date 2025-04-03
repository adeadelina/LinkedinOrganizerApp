import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Filter, Edit2 } from "lucide-react";
import { PostCard } from "@/components/post-card";
import { CategoryFilter } from "@/components/category-filter";
import { Navbar } from "@/components/navbar";
import { apiRequest } from "@/lib/queryClient";
import { contentUrlSchema, type Post } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { toast } = useToast();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<string>("Most Recent");
  
  // Create form with zod validation
  const form = useForm<{ url: string }>({
    resolver: zodResolver(contentUrlSchema),
    defaultValues: {
      url: "",
    },
  });

  // Fetch all posts
  const { 
    data: posts = [], 
    isLoading: isLoadingPosts,
    refetch: refetchPosts 
  } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
    staleTime: 1000, // Consider data stale after 1 second
    refetchInterval: 3000, // Poll every 3 seconds
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });

  // Fetch all categories
  const { 
    data: categories = [], 
    isLoading: isLoadingCategories,
    refetch: refetchCategories
  } = useQuery<string[]>({
    queryKey: ["/api/categories"],
    staleTime: 0, // Always fetch fresh data
    refetchInterval: 3000, // Aggressively poll every 3 seconds
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always", // Always refetch when window regains focus
    refetchOnReconnect: "always"
  });

  // Mutation for analyzing a LinkedIn post
  const { mutate: analyzePost, isPending: isAnalyzing } = useMutation({
    mutationFn: async (url: string) => {
      console.log("Submitting URL for analysis:", url);
      // Server will check for duplicates, we just send the URL
      return await apiRequest("/api/analyze", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
    },
    onSuccess: (data) => {
      console.log("Analysis success, data:", data);
      
      // Handle the response
      if (data.exists) {
        toast({
          title: "URL already analyzed",
          description: "This content has already been analyzed and is in your library.",
          variant: "default",
          duration: 5000, // 5 seconds
        });
      } else {
        toast({
          title: "Content submitted for analysis",
          description: "Your content is being analyzed. Results will appear shortly.",
          variant: "default",
          duration: 5000, // 5 seconds
        });
      }
      
      // Reset the form after showing the toast message
      form.reset();
      
      // Set up multiple refetches to catch status changes
      const refetchIntervals = [2000, 5000, 10000]; // Refetch after 2s, 5s, and 10s
      refetchIntervals.forEach(interval => {
        setTimeout(() => {
          console.log(`Refetching posts after ${interval}ms...`);
          refetchPosts();
        }, interval);
      });
    },
    onError: (error) => {
      console.error("Analysis error:", error);
      toast({
        title: "Failed to analyze content",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = async (data: { url: string }) => {
    console.log("Form submitted with URL:", data.url);
    // Don't submit if already analyzing or if the URL is empty
    if (isAnalyzing) {
      console.log("Submission blocked: Already analyzing");
      return;
    }
    
    if (!data.url.trim()) {
      console.log("Submission blocked: Empty URL");
      toast({
        title: "Empty URL",
        description: "Please enter a LinkedIn or Substack URL to analyze",
        variant: "destructive",
      });
      return;
    }
    
    // Proceed with analysis
    analyzePost(data.url);
  };

  // Get the most recent post for the "Analyzed content" section
  const getMostRecentPost = () => {
    if (posts.length === 0) return [];
    
    // Filter posts by the selected categories if needed
    const eligiblePosts = posts.filter(post => {
      // Skip failed or processing posts
      if (post.processingStatus !== "completed") return false;
      
      // Apply category filter
      if (selectedCategories.length === 0) return true;
      
      // Check if the post has at least one of the selected categories
      return post.categories && 
             Array.isArray(post.categories) && 
             selectedCategories.some(category => post.categories?.includes(category) ?? false);
    });
    
    if (eligiblePosts.length === 0) return [];
    
    // Sort filtered posts by createdAt date
    const sortedPosts = [...eligiblePosts].sort((a, b) => {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    
    // Return only the most recent post
    return [sortedPosts[0]];
  };
  
  // Get the most recent post that respects category filter
  const mostRecentPost = getMostRecentPost();
  
  // Filter posts by category - exclude the most recent post from this list
  const filteredPosts = posts.filter((post) => {
    // Skip the most recent post since it's displayed separately
    if (mostRecentPost.length > 0 && post.id === mostRecentPost[0].id) return false;
    
    // Skip posts that are still processing or failed
    if (post.processingStatus !== "completed") return false;
    
    // Apply category filter
    if (selectedCategories.length === 0) return true;
    
    // Check if the post has at least one of the selected categories
    return post.categories && 
           Array.isArray(post.categories) && 
           selectedCategories.some(category => post.categories?.includes(category) ?? false);
  });

  // Sort filtered posts (excludes the most recent one)
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortOrder === "Most Recent") {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (sortOrder === "Oldest First") {
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    }
    return 0;
  });

  // Group posts by category for the categorized view - exclude the most recent post
  const postsByCategory = categories.reduce((acc, category) => {
    // Skip categories that don't match the selected categories filter
    if (selectedCategories.length > 0 && !selectedCategories.includes(category)) {
      return acc;
    }
    
    const categoryPosts = posts.filter(post => 
      // Include only completed posts with this category
      post.categories && 
      Array.isArray(post.categories) && 
      post.categories?.includes(category) && 
      post.processingStatus === "completed"
    );
    
    if (categoryPosts.length > 0) {
      acc[category] = categoryPosts;
    }
    return acc;
  }, {} as Record<string, Post[]>);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* Navbar */}
      <div className="flex-shrink-0">
        <Navbar />
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          categories={categories} 
          onCategoryChange={(category) => {
            // Toggle category selection - if it's already selected, remove it
            if (selectedCategories.includes(category)) {
              setSelectedCategories(selectedCategories.filter(cat => cat !== category));
            } else {
              // Otherwise add it to the selection
              setSelectedCategories([...selectedCategories, category]);
            }
            // Force refetch data to ensure sidebar is consistent
            refetchCategories();
            refetchPosts();
          }} 
          selectedCategories={selectedCategories}
        />

        {/* Main Content */}
        <div className="flex flex-col w-0 flex-1 overflow-hidden">
          <main className="relative flex-1 overflow-y-auto focus:outline-none bg-gray-50">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {/* Content Analyzer Header Section */}
                <Card className="mb-6">
                  <CardHeader className="px-6">
                    <CardTitle className="text-xl">Content Analyzer</CardTitle>
                    <CardDescription>Extract, analyze, and categorize LinkedIn posts and Substack newsletters</CardDescription>
                  </CardHeader>
                  
                  {/* Analyze Content Section */}
                  <CardContent className="border-t border-gray-200 px-6 py-5">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Analyze Content</h2>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="url"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Content URL</FormLabel>
                              <div className="flex items-start gap-3">
                                <FormControl>
                                  <Input 
                                    placeholder="https://www.linkedin.com/posts/... or https://newsletter.example.com/p/..." 
                                    {...field} 
                                    className="flex-1"
                                  />
                                </FormControl>
                                <Button 
                                  type="submit" 
                                  disabled={isAnalyzing}
                                  className="bg-[#0A66C2] hover:bg-blue-700"
                                >
                                  {isAnalyzing ? "Processing..." : "Extract & Categorize"}
                                </Button>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </form>
                    </Form>
                  </CardContent>
                </Card>
                
                {/* Results Section */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between px-6 py-5">
                    <CardTitle className="text-lg font-medium">Analyzed content</CardTitle>
                    <div className="flex space-x-2">
                      <div className="flex flex-col sm:flex-row gap-2">
                        {selectedCategories.length > 0 ? (
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="text-sm text-gray-500 mr-1">Filtered by:</span>
                            {selectedCategories.map(category => (
                              <CategoryFilter
                                key={category}
                                category={category}
                                isSelected={true}
                                onClick={() => {
                                  setSelectedCategories(selectedCategories.filter(cat => cat !== category));
                                  refetchCategories();
                                  refetchPosts();
                                }}
                              />
                            ))}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setSelectedCategories([]);
                                refetchCategories();
                                refetchPosts();
                              }}
                              className="ml-1 h-6 text-xs"
                            >
                              Clear All
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">All Categories</span>
                        )}
                      </div>
                      
                      <Select 
                        value={sortOrder} 
                        onValueChange={setSortOrder}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Most Recent" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Most Recent">Most Recent</SelectItem>
                          <SelectItem value="Oldest First">Oldest First</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button variant="outline" size="sm" className="flex items-center">
                        <Filter className="h-4 w-4 mr-1" />
                        More Filters
                      </Button>
                    </div>
                  </CardHeader>
                  
                  {/* List of analyzed content - only the most recent post */}
                  <CardContent className="px-0">
                    {isLoadingPosts ? (
                      <div className="p-6 text-center">Loading content...</div>
                    ) : mostRecentPost.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        No content has been analyzed yet. Enter a LinkedIn or Substack URL above to get started.
                      </div>
                    ) : (
                      <div>
                        {/* Display only the most recent post */}
                        {mostRecentPost.map((post) => (
                          <PostCard 
                            key={post.id} 
                            post={post} 
                            onRefetch={refetchPosts}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                  
                  {/* Message when filter is active but no categories match */}
                  {selectedCategories.length > 0 && 
                   mostRecentPost.length === 0 && 
                   Object.keys(postsByCategory).length === 0 && (
                    <CardContent className="border-t border-gray-200 px-6 py-5">
                      <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-center">
                        <h3 className="text-md font-medium text-amber-800 mb-2">No posts match these categories</h3>
                        <p className="text-sm text-amber-700">
                          There are no posts matching the selected {selectedCategories.length === 1 ? 'category' : 'categories'}.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3"
                          onClick={() => {
                            setSelectedCategories([]);
                            refetchCategories();
                            refetchPosts();
                          }}
                        >
                          Clear Filter
                        </Button>
                      </div>
                    </CardContent>
                  )}

                  {/* Categories Section */}
                  {Object.keys(postsByCategory).length > 0 && (
                    <CardContent className="border-t border-gray-200 px-6 py-5">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-medium text-gray-900">Categories</h2>
                        {selectedCategories.length > 0 && (
                          <div className="flex items-center flex-wrap gap-1">
                            <span className="text-sm text-gray-500 mr-1">Filtered by:</span>
                            {selectedCategories.map(category => (
                              <CategoryFilter 
                                key={category}
                                category={category} 
                                isSelected={true}
                                onClick={() => {
                                  setSelectedCategories(selectedCategories.filter(cat => cat !== category));
                                  refetchCategories();
                                  refetchPosts();
                                }}
                              />
                            ))}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setSelectedCategories([]);
                                refetchCategories();
                                refetchPosts();
                              }}
                              className="ml-1 h-6 text-xs"
                            >
                              Clear All
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {Object.entries(postsByCategory).map(([category, categoryPosts]) => (
                        <div key={category} className="mb-8">
                          <h3 className="text-md font-medium text-gray-800 mb-4">{category}</h3>
                          
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {categoryPosts.slice(0, 3).map((post) => (
                              <div 
                                key={post.id} 
                                className="relative rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm cursor-pointer"
                                onClick={(e) => {
                                  // Only open dialog when clicking on the card but not on buttons or links
                                  const target = e.target as HTMLElement;
                                  const isButton = target.closest('button') || target.closest('a');
                                  const isCategoryTag = target.closest('.category-tag');
                                  
                                  if (!isButton && !isCategoryTag) {
                                    // Find the PostCard component in the hidden div and trigger dialog opening
                                    const postCardRef = document.getElementById(`post-card-ref-${post.id}`);
                                    if (postCardRef) {
                                      // Create a dialog element for this post if it doesn't exist
                                      // Create and show the post dialog
                                      const dialogRef = document.createElement('div');
                                      dialogRef.id = `post-dialog-${post.id}`;
                                      dialogRef.className = 'fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center';
                                      
                                      // Add click handler to close when clicking outside the dialog content
                                      dialogRef.addEventListener('click', (event: MouseEvent) => {
                                        // Only close if clicking the backdrop (dialogRef itself) and not its children
                                        if (event.target === dialogRef) {
                                          document.body.removeChild(dialogRef);
                                        }
                                      });
                                      
                                      const dialogContent = document.createElement('div');
                                      dialogContent.className = 'bg-white rounded-lg max-w-[680px] max-h-[80vh] overflow-y-auto w-full m-4';
                                      
                                      // Header section
                                      const header = document.createElement('div');
                                      header.className = 'border-b p-4 flex justify-between items-center';
                                      
                                      const title = document.createElement('div');
                                      title.className = 'flex items-center';
                                      
                                      // Author image/avatar
                                      if (post.authorImage) {
                                        const img = document.createElement('img');
                                        img.src = post.authorImage;
                                        img.alt = post.authorName || 'Author';
                                        img.className = 'h-8 w-8 rounded-full mr-2';
                                        title.appendChild(img);
                                      } else {
                                        const avatar = document.createElement('div');
                                        avatar.className = 'h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mr-2';
                                        avatar.textContent = post.authorName?.[0] || 'U';
                                        title.appendChild(avatar);
                                      }
                                      
                                      // Author name
                                      const authorName = document.createElement('div');
                                      authorName.className = 'font-medium';
                                      authorName.textContent = post.authorName || 'Content Author';
                                      title.appendChild(authorName);
                                      
                                      // Close button
                                      const closeBtn = document.createElement('button');
                                      closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>';
                                      closeBtn.className = 'text-gray-500 hover:text-gray-700';
                                      closeBtn.onclick = () => {
                                        document.body.removeChild(dialogRef);
                                      };
                                      
                                      header.appendChild(title);
                                      header.appendChild(closeBtn);
                                      dialogContent.appendChild(header);
                                      
                                      // Content section
                                      const content = document.createElement('div');
                                      content.className = 'p-4';
                                      
                                      // URL as subtitle
                                      const urlText = document.createElement('p');
                                      urlText.className = 'text-sm text-gray-500 mb-4';
                                      urlText.textContent = post.url || '';
                                      content.appendChild(urlText);
                                      
                                      // Post content
                                      if (post.content) {
                                        const contentDiv = document.createElement('div');
                                        contentDiv.className = 'text-sm text-gray-700 space-y-3';
                                        
                                        post.content.split('\n').forEach(paragraph => {
                                          if (paragraph.trim()) {
                                            const p = document.createElement('p');
                                            p.className = 'mb-2';
                                            p.textContent = paragraph;
                                            contentDiv.appendChild(p);
                                          } else {
                                            contentDiv.appendChild(document.createElement('br'));
                                          }
                                        });
                                        
                                        content.appendChild(contentDiv);
                                      } else {
                                        // No content message
                                        const noContent = document.createElement('div');
                                        noContent.className = 'p-4 bg-amber-50 border border-amber-200 rounded-md';
                                        noContent.innerHTML = `
                                          <p class="text-amber-800 flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            This post doesn't have content available for display.
                                          </p>
                                          <p class="text-amber-700 mt-2 text-sm">
                                            This might be because the post was imported without content extraction 
                                            or there was an issue during content extraction.
                                          </p>
                                          <p class="text-amber-700 mt-2 text-sm">
                                            You can still view the original content at the source by clicking "View Original" below.
                                          </p>
                                        `;
                                        content.appendChild(noContent);
                                      }
                                      
                                      // Categories section
                                      if (post.categories && post.categories.length > 0) {
                                        const categoriesSection = document.createElement('div');
                                        categoriesSection.className = 'mt-6 pt-4 border-t border-gray-200';
                                        
                                        const categoriesTitle = document.createElement('h4');
                                        categoriesTitle.className = 'text-sm font-medium mb-2';
                                        categoriesTitle.textContent = 'Categories:';
                                        categoriesSection.appendChild(categoriesTitle);
                                        
                                        const categoriesList = document.createElement('div');
                                        categoriesList.className = 'flex flex-wrap gap-1.5';
                                        
                                        post.categories.forEach(category => {
                                          const badge = document.createElement('span');
                                          badge.className = 'inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-700';
                                          badge.textContent = category;
                                          categoriesList.appendChild(badge);
                                        });
                                        
                                        categoriesSection.appendChild(categoriesList);
                                        content.appendChild(categoriesSection);
                                      }
                                      
                                      dialogContent.appendChild(content);
                                      
                                      // Footer with actions
                                      const footer = document.createElement('div');
                                      footer.className = 'border-t p-4 flex justify-end';
                                      
                                      // View original link
                                      const viewOriginalLink = document.createElement('a');
                                      viewOriginalLink.href = post.url || '';
                                      viewOriginalLink.target = '_blank';
                                      viewOriginalLink.rel = 'noopener noreferrer';
                                      
                                      const viewButton = document.createElement('button');
                                      viewButton.className = 'px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-transparent rounded-md hover:bg-blue-100';
                                      viewButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg> View Original';
                                      
                                      viewOriginalLink.appendChild(viewButton);
                                      
                                      footer.appendChild(viewOriginalLink);
                                      
                                      dialogContent.appendChild(footer);
                                      dialogRef.appendChild(dialogContent);
                                      
                                      // Add to the DOM
                                      document.body.appendChild(dialogRef);
                                      
                                      // Prevent event bubbling
                                      e.stopPropagation();
                                    }
                                  }
                                }}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                      {post.authorImage ? (
                                        <img 
                                          src={post.authorImage} 
                                          alt={post.authorName || (post.url?.includes("linkedin.com") ? "LinkedIn Author" : "Content Author")} 
                                          className="h-8 w-8 rounded-full"
                                        />
                                      ) : (
                                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                          {post.authorName?.[0] || (post.url?.includes("linkedin.com") ? "L" : "U")}
                                        </div>
                                      )}
                                    </div>
                                    <div className="ml-3">
                                      <h3 className="text-sm font-medium text-gray-900">
                                        {post.authorName ? post.authorName : (post.url?.includes("linkedin.com") ? "LinkedIn Author" : "Content Author")}
                                      </h3>
                                      <p className="text-xs text-gray-500">
                                        {post.createdAt 
                                          ? new Date(post.createdAt).toLocaleString() 
                                          : "less than a minute ago"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="mt-2">
                                  <p className="text-sm text-gray-500 line-clamp-3">{post.content}</p>
                                </div>
                                
                                <div className="mt-3">
                                  <div className="flex flex-wrap gap-1">
                                    {post.categories?.map((cat) => (
                                      <CategoryFilter 
                                        key={cat} 
                                        category={cat} 
                                        className="text-xs category-tag"
                                        onClick={(e) => {
                                          // Make sure e is defined before using it
                                          if (e) e.stopPropagation(); // Prevent card click
                                          // Toggle category selection
                                          if (selectedCategories.includes(cat)) {
                                            setSelectedCategories(selectedCategories.filter(c => c !== cat));
                                          } else {
                                            setSelectedCategories([...selectedCategories, cat]);
                                          }
                                          refetchCategories();
                                          refetchPosts();
                                        }}
                                        isSelected={selectedCategories.includes(cat)}
                                      />
                                    ))}
                                  </div>
                                  
                                  <div className="mt-2 flex justify-between">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs"
                                      onClick={(e) => {
                                        if (e) e.stopPropagation(); // Prevent card click
                                        // Find the edit button by ID and click it
                                        document.getElementById(`edit-categories-${post.id}`)?.click();
                                      }}
                                    >
                                      <Edit2 className="h-3.5 w-3.5 mr-1" />
                                      Edit Categories
                                    </Button>

                                    <a
                                      href={post.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e && e.stopPropagation()} // Prevent card click
                                    >
                                      <Button variant="ghost" size="sm" className="text-xs text-[#0A66C2] bg-[#EEF3F8] hover:bg-blue-50">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        View
                                      </Button>
                                    </a>
                                  </div>
                                  
                                  {/* Hidden PostCard to handle category editing dialog */}
                                  <div className="hidden">
                                    <div id={`post-card-ref-${post.id}`}>
                                      <PostCard post={post} onRefetch={refetchPosts} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      
                      {Object.keys(postsByCategory).length > 0 && (
                        <div className="flex justify-center mt-8">
                          <Button variant="outline" className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            View more
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}