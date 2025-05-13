
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PostBookmarkCard } from "@/components/post-bookmark-card";
import { Navbar } from "@/components/navbar";
import type { Post } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Unread() {
  const [sortOrder, setSortOrder] = useState<string>("Most Recent");

  // Fetch all posts
  const { 
    data: posts = [], 
    isLoading: isLoadingPosts,
    refetch: refetchPosts 
  } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
    staleTime: 1000,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });

  // Filter posts with no categories
  const uncategorizedPosts = posts.filter(post => 
    post.processingStatus === "completed" && 
    (!post.categories || post.categories.length === 0)
  );

  // Sort filtered posts
  const sortedPosts = [...uncategorizedPosts].sort((a, b) => {
    if (sortOrder === "Most Recent") {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (sortOrder === "Oldest First") {
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    }
    return 0;
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      <div className="flex-shrink-0">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4">
          <Link href="/">
            <a className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Main Page
            </a>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <main className="relative flex-1 overflow-y-auto focus:outline-none bg-gray-50">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Card>
                <CardHeader className="px-6 py-5">
                  <CardTitle className="text-lg font-medium mb-4">Uncategorized content</CardTitle>
                  <div className="flex justify-end">
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
                </CardHeader>

                <CardContent className="px-6">
                  {isLoadingPosts ? (
                    <div className="p-6 text-center">Loading content...</div>
                  ) : sortedPosts.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      No uncategorized posts found.
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
  );
}
