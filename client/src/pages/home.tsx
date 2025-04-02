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
import { Filter } from "lucide-react";
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

    // Filter posts by the selected category if needed
    const eligiblePosts = posts.filter(post => {
      // Skip failed or processing posts
      if (post.processingStatus !== "completed") return false;

      // Apply category filter
      if (selectedCategories.length === 0) return true;
      return post.categories?.some(cat => selectedCategories.includes(cat));
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
    return post.categories?.some(cat => selectedCategories.includes(cat));
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
    // Skip categories that don't match the selected category filter
    if (selectedCategories.length > 0 && !selectedCategories.includes(category)) {
      return acc;
    }

    const categoryPosts = posts.filter(post => 
      // Skip the most recent post
      (mostRecentPost.length === 0 || post.id !== mostRecentPost[0].id) &&
      // Include only completed posts with this category
      post.categories?.includes(category) && post.processingStatus === "completed"
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
            // Toggle category selection
            const updatedSelectedCategories = selectedCategories.includes(category)
              ? selectedCategories.filter(cat => cat !== category)
              : [...selectedCategories, category];
            setSelectedCategories(updatedSelectedCategories);
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
                      {/* This section needs to be updated to handle multiple selections */}
                      <Select 
                        value={selectedCategories.length > 0 ? selectedCategories.join(', ') : "All Categories"} 
                        onValueChange={(value) => {
                          setSelectedCategories(value === "All Categories" ? [] : value.split(',').map(item => item.trim()))
                          refetchPosts()
                        }}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All Categories">All Categories</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

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
                        <h3 className="text-md font-medium text-amber-800 mb-2">No posts match this category</h3>
                        <p className="text-sm text-amber-700">There are no posts in the selected categories.</p>
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
                          <div className="flex items-center">
                            <span className="text-sm text-gray-500 mr-2">Filtered by:</span>
                            {selectedCategories.map(cat => (
                              <CategoryFilter 
                                key={cat}
                                category={cat} 
                                isSelected={true}
                                onClick={() => {
                                  setSelectedCategories(selectedCategories.filter(c => c !== cat));
                                  refetchCategories();
                                  refetchPosts();
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {Object.entries(postsByCategory).map(([category, categoryPosts]) => (
                        <div key={category} className="mb-8">
                          <h3 className="text-md font-medium text-gray-800 mb-4">{category}</h3>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {categoryPosts.slice(0, 3).map((post) => (
                              <div key={post.id} className="relative rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                      {post.authorImage ? (
                                        <img 
                                          src={post.authorImage} 
                                          alt={post.authorName || "User"} 
                                          className="h-8 w-8 rounded-full"
                                        />
                                      ) : (
                                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                          {post.authorName?.[0] || "U"}
                                        </div>
                                      )}
                                    </div>
                                    <div className="ml-3">
                                      <h3 className="text-sm font-medium text-gray-900">{post.authorName || "Content Author"}</h3>
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
                                        className="text-xs"
                                        onClick={() => {
                                          const updatedSelectedCategories = selectedCategories.includes(cat)
                                            ? selectedCategories.filter(c => c !== cat)
                                            : [...selectedCategories, cat];
                                          setSelectedCategories(updatedSelectedCategories);
                                          refetchCategories();
                                          refetchPosts();
                                        }}
                                        isSelected={selectedCategories.includes(cat)}
                                      />
                                    ))}
                                  </div>

                                  <div className="mt-2 flex justify-end">
                                    <Button variant="ghost" size="sm" className="text-xs text-[#0A66C2] bg-[#EEF3F8] hover:bg-blue-50">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      View
                                    </Button>
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