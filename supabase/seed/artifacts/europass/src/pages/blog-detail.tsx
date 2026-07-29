import { useParams, Link } from "wouter";
import { useGetBlogPost } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, Calendar, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotFound from "./not-found";

export default function BlogDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  
  const { data: post, isLoading, error } = useGetBlogPost(id, {
    query: { enabled: !!id, queryKey: ['/api/blog', id] }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-3xl">
        <Skeleton className="h-12 w-3/4 mb-6" />
        <Skeleton className="h-6 w-1/2 mb-12" />
        <Skeleton className="h-[400px] w-full rounded-2xl mb-8" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (error || !post) {
    return <NotFound />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <div className="container mx-auto px-4 lg:px-8 pt-12 max-w-4xl">
        <Link href="/blog" className="inline-flex items-center text-muted-foreground hover:text-primary mb-8 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to blog
        </Link>
        
        <header className="mb-12">
          <div className="flex items-center gap-4 text-sm font-bold uppercase tracking-wider text-muted-foreground mb-6">
            <span className="text-secondary">{post.category}</span>
            <span className="flex items-center"><Clock className="w-4 h-4 mr-1"/> {post.readingTime} min read</span>
            {post.publishedAt && (
              <span className="flex items-center"><Calendar className="w-4 h-4 mr-1"/> {new Date(post.publishedAt).toLocaleDateString()}</span>
            )}
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold leading-tight mb-8">
            {post.title}
          </h1>
          
          <div className="flex items-center justify-between border-y border-border py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                {post.authorPhoto && <img src={post.authorPhoto} alt={post.author} className="w-full h-full object-cover" />}
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">{post.author}</p>
                <p className="text-xs text-muted-foreground">EuroPass Contributor</p>
              </div>
            </div>
            
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary rounded-full">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {post.featuredImageUrl && (
          <div className="aspect-[21/9] w-full rounded-3xl overflow-hidden mb-16">
            <img src={post.featuredImageUrl} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="prose prose-lg md:prose-xl prose-headings:font-display prose-headings:font-bold prose-a:text-primary prose-a:font-semibold max-w-none text-foreground/80">
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>
      </div>
    </div>
  );
}
