import { useState } from "react";
import { Link } from "wouter";
import { useListBlogPosts } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Calendar, User, Clock } from "lucide-react";

export default function Blog() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: posts, isLoading } = useListBlogPosts();

  const filteredPosts = posts?.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* HEADER */}
      <section className="bg-primary py-24 text-primary-foreground">
        <div className="container mx-auto px-4 lg:px-8 text-center max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-display font-bold mb-6">News & Insights</h1>
          <p className="text-lg sm:text-xl text-primary-foreground/80">
            Guides, success stories, and updates from the EuroPass community.
          </p>
        </div>
      </section>

      {/* SEARCH */}
      <section className="py-8 border-b border-border bg-white sticky top-20 z-40">
        <div className="container mx-auto px-4 lg:px-8 flex justify-end">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search articles..." 
              className="pl-9 w-full bg-muted/50 border-transparent focus:bg-white focus:border-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            {isLoading ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-64 rounded-2xl w-full" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ))
            ) : filteredPosts && filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.id}`} className="group block space-y-5">
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-muted border border-border">
                    {post.featuredImageUrl ? (
                      <img src={post.featuredImageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full bg-primary/5 flex items-center justify-center">
                        <span className="text-primary/20 text-4xl font-display font-bold">EuroPass</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <span className="text-secondary">{post.category}</span>
                      <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> {post.readingTime} min read</span>
                    </div>
                    <h3 className="text-2xl font-display font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground line-clamp-3 leading-relaxed">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center gap-2 pt-4 border-t border-border">
                      <div className="w-6 h-6 rounded-full bg-muted overflow-hidden">
                        {post.authorPhoto && <img src={post.authorPhoto} alt={post.author} className="w-full h-full object-cover" />}
                      </div>
                      <span className="text-xs font-medium text-foreground">{post.author}</span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-24 text-center">
                <p className="text-muted-foreground text-lg">No articles found matching your search.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
