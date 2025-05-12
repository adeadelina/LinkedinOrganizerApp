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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Filter, Edit2, Grid, List, Columns, Rows, BookmarkPlus, Tag, ChevronDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PostCard } from "@/components/post-card";
import { PostBookmarkCard } from "@/components/post-bookmark-card";
import { CategoryFilter } from "@/components/category-filter";
import { Navbar } from "@/components/navbar";
import { apiRequest } from "@/lib/queryClient";
import { contentUrlSchema, type Post } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { toast } = useToast();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<string>("Most Recent");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchBy, setSearchBy] = useState<"keyword" | "author">("keyword");

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

  // Filter and sort all posts
  const filteredPosts = posts.filter((post) => {
    // Skip posts that are still processing or failed
    if (post.processingStatus !== "completed") return false;

    // Apply search filter if there's a search term
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      const contentLower = (post.content || "").toLowerCase();
      const authorLower = (post.authorName || "").toLowerCase();

      if (searchBy === "keyword") {
        if (!contentLower.includes(searchTermLower)) return false;
      } else if (searchBy === "author") {
        if (!authorLower.includes(searchTermLower)) return false;
      } else {
        // Search in both content and author name
        if (!contentLower.includes(searchTermLower) && !authorLower.includes(searchTermLower)) {
          return false;
        }
      }
    }

    // Apply category filter
    if (selectedCategories.length === 0) return true;

    // Check if the post has at least one of the selected categories
    return post.categories && 
           Array.isArray(post.categories) && 
           // Make sure we're only checking against valid categories
           selectedCategories
             .filter(cat => categories.includes(cat))
             .some(category => post.categories?.includes(category) ?? false);
  });

  // Sort filtered posts
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

    // First filter posts by category and completion status
    let categoryPosts = posts.filter(post => 
      // Include only completed posts with this category
      post.categories && 
      Array.isArray(post.categories) && 
      post.categories?.includes(category) && 
      post.processingStatus === "completed"
    );

    // Then apply search filter if there's a search term
    if (searchTerm.trim()) {
      categoryPosts = categoryPosts.filter(post => {
        if (searchBy === "keyword") {
          // Search in post content
          const contentLower = (post.content || "").toLowerCase();
          const summaryLower = (post.summary || "").toLowerCase();
          const searchTermLower = searchTerm.toLowerCase();

          return contentLower.includes(searchTermLower) || summaryLower.includes(searchTermLower);
        } else if (searchBy === "author") {
          // Search by author name
          const authorLower = (post.authorName || "").toLowerCase();
          const searchTermLower = searchTerm.toLowerCase();

          return authorLower.includes(searchTermLower);
        }
        return true;
      });
    }

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
          onSearch={(term, searchByType) => {
            setSearchTerm(term);
            setSearchBy(searchByType);
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
                  <CardContent className="px-6 py-5">
                    <h1 className="text-2xl font-semibold text-gray-900 mb-4">Extract, analyze, and categorize LinkedIn posts</h1>

                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="url"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-start gap-3">
                                <FormControl>
                                  <Input 
                                    placeholder="Add your Linkedin post link" 
                                    {...field} 
                                    className="flex-1"
                                  />
                                </FormControl>
                                <Button 
                                  type="submit" 
                                  disabled={isAnalyzing}
                                  className="bg-[#0A66C2] hover:bg-blue-700"
                                >
                                  {isAnalyzing ? "Processing..." : "Import content"}
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
                  <CardHeader className="px-6 py-5">
                    <CardTitle className="text-lg font-medium mb-4">Analyzed content</CardTitle>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Search..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                          }}
                        />
                        <Select value={searchBy} onValueChange={(value: "keyword" | "author") => setSearchBy(value)}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Search by..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="keyword">By keyword</SelectItem>
                            <SelectItem value="author">By author</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[180px] justify-between">
                              {selectedCategories.length === 0 ? (
                                "All Categories"
                              ) : (
                                `${selectedCategories.length} selected`
                              )}
                              <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[200px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search categories..." />
                              <CommandList>
                                <CommandEmpty>No categories found.</CommandEmpty>
                                <CommandGroup className="max-h-[200px] overflow-auto">
                                  {categories.map((category) => (
                                    <CommandItem
                                      key={category}
                                      onSelect={() => {
                                        setSelectedCategories((prev) =>
                                          prev.includes(category)
                                            ? prev.filter((c) => c !== category)
                                            : [...prev, category]
                                        );
                                        refetchCategories();
                                        refetchPosts();
                                      }}
                                    >
                                      <Checkbox
                                        checked={selectedCategories.includes(category)}
                                        className="mr-2"
                                      />
                                      {category}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>

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
                      </div>
                    </div>
                  </CardHeader>

                  {/* List of analyzed content with grid layout */}
                  <CardContent className="px-6">
                    {isLoadingPosts ? (
                      <div className="p-6 text-center">Loading content...</div>
                    ) : sortedPosts.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        {selectedCategories.length > 0 ? (
                          <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
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
                        ) : (
                          "No content has been analyzed yet. Enter a LinkedIn or Substack URL above to get started."
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
                        {sortedPosts.map((post) => (
                          <PostBookmarkCard 
                            key={post.id} 
                            post={post} 
                            onRefetch={refetchPosts}
                            className="h-full bg-white hover:shadow-lg transition-shadow duration-200"
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}