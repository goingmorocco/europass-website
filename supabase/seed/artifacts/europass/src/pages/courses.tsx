import { useState } from "react";
import { Link } from "wouter";
import { useListCourses } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, Clock, ArrowRight } from "lucide-react";

export default function Courses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const { data: courses, isLoading } = useListCourses({});

  const categories = ["All", "German", "French", "English", "Professional Prep"];

  const filteredCourses = courses?.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || course.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* HEADER */}
      <section className="bg-primary py-24 text-primary-foreground">
        <div className="container mx-auto px-4 lg:px-8 text-center max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-display font-bold mb-6">Our Courses</h1>
          <p className="text-lg sm:text-xl text-primary-foreground/80">
            Intensive, structured programs designed to get you certified and ready for Europe.
          </p>
        </div>
      </section>

      {/* FILTER & SEARCH */}
      <section className="py-8 border-b border-border bg-white sticky top-20 z-40">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground mr-2 flex items-center"><Filter className="w-4 h-4 mr-1"/> Filter:</span>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === cat 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search courses..." 
                className="pl-9 w-full bg-muted/50 border-transparent focus:bg-white focus:border-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoading ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="flex flex-col space-y-4 bg-white p-4 rounded-2xl border border-border">
                  <Skeleton className="h-48 rounded-xl w-full" />
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ))
            ) : filteredCourses && filteredCourses.length > 0 ? (
              filteredCourses.map((course) => (
                <Link key={course.id} href={`/courses/${course.slug}`} className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-lg transition-all duration-300">
                  <div className="h-56 overflow-hidden bg-muted relative">
                    {course.imageUrl ? (
                      <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary font-display font-bold text-2xl">
                        {course.language || course.category}
                      </div>
                    )}
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-primary uppercase tracking-wider">
                      {course.levels}
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-secondary uppercase tracking-wider">{course.category}</span>
                      <span className="text-xs font-medium text-muted-foreground flex items-center">
                        <Clock className="w-3 h-3 mr-1" /> {course.duration}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors">{course.title}</h3>
                    <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">{course.description}</p>
                    
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                      <span className="font-bold text-lg text-foreground">{course.price || "Contact Us"}</span>
                      <span className="text-primary flex items-center font-medium group-hover:translate-x-1 transition-transform">
                        Details <ArrowRight className="ml-1 h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-24 text-center">
                <h3 className="text-2xl font-bold text-foreground mb-2">No courses found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or search term.</p>
                <Button variant="outline" className="mt-6" onClick={() => { setSearchTerm(""); setSelectedCategory("All"); }}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
