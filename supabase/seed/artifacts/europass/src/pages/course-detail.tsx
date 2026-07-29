import { useParams } from "wouter";
import { Link } from "wouter";
import { useListCourses } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, GraduationCap, CheckCircle2, ChevronRight, FileText } from "lucide-react";
import NotFound from "./not-found";

export default function CourseDetail() {
  const params = useParams();
  const slug = params.slug;
  
  // We use useListCourses and filter by slug because the API getCourse requires ID
  const { data: courses, isLoading } = useListCourses({});
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-24">
        <Skeleton className="h-12 w-1/3 mb-6" />
        <Skeleton className="h-6 w-2/3 mb-12" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const course = courses?.find(c => c.slug === slug);

  if (!course) {
    return <NotFound />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* HERO */}
      <section className="relative bg-primary text-primary-foreground py-24 lg:py-32">
        {course.imageUrl && (
          <div className="absolute inset-0 z-0 opacity-20 mix-blend-luminosity">
            <img src={course.imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="relative z-10 container mx-auto px-4 lg:px-8">
          <Link href="/courses" className="inline-flex items-center text-primary-foreground/70 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to courses
          </Link>
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="py-1 px-3 rounded-full bg-secondary/20 text-secondary font-bold text-xs uppercase tracking-wider border border-secondary/30">
                {course.category}
              </span>
              <span className="py-1 px-3 rounded-full bg-white/10 font-bold text-xs uppercase tracking-wider">
                Levels: {course.levels}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6">
              {course.title}
            </h1>
            <p className="text-xl text-primary-foreground/80 leading-relaxed mb-8">
              {course.description}
            </p>
            <div className="flex flex-wrap items-center gap-6 text-sm font-medium">
              <div className="flex items-center">
                <Clock className="w-5 h-5 mr-2 text-secondary" />
                <span>{course.duration}</span>
              </div>
              {course.price && (
                <div className="flex items-center">
                  <div className="w-5 h-5 rounded-full bg-secondary text-primary flex items-center justify-center mr-2 font-bold">$</div>
                  <span>{course.price}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12 items-start">
            <div className="lg:col-span-2 space-y-12">
              
              {course.overview && (
                <div>
                  <h2 className="text-3xl font-display font-bold mb-6 text-primary">Course Overview</h2>
                  <div className="prose prose-lg max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: course.overview }} />
                </div>
              )}

              {course.curriculum && (
                <div>
                  <h2 className="text-3xl font-display font-bold mb-6 text-primary">Curriculum</h2>
                  <div className="prose prose-lg max-w-none text-muted-foreground bg-white p-8 rounded-2xl border border-border" dangerouslySetInnerHTML={{ __html: course.curriculum }} />
                </div>
              )}

              {course.benefits && (
                <div>
                  <h2 className="text-3xl font-display font-bold mb-6 text-primary">What You'll Learn</h2>
                  <div className="prose prose-lg max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: course.benefits }} />
                </div>
              )}
            </div>

            {/* SIDEBAR */}
            <div className="lg:col-span-1 sticky top-32">
              <div className="bg-white rounded-3xl p-8 border border-border shadow-xl">
                <h3 className="text-2xl font-display font-bold mb-6">Enroll Now</h3>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-secondary mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Small class sizes (max 12 students)</span>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-secondary mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Official exam preparation included</span>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-secondary mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Access to digital learning portal</span>
                  </div>
                </div>

                <Button size="lg" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold mb-4" asChild>
                  <Link href={`/register?course=${course.id}`}>Register for Course</Link>
                </Button>
                <Button size="lg" variant="outline" className="w-full" asChild>
                  <Link href="/contact">Ask a Question</Link>
                </Button>
              </div>

              <div className="mt-8 bg-muted/50 rounded-3xl p-8 border border-border">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">Need a Visa?</h4>
                    <p className="text-xs text-muted-foreground">We assist with study visas</p>
                  </div>
                </div>
                <Link href="/ausbildung" className="text-sm font-bold text-primary flex items-center hover:underline">
                  Learn about Ausbildung pathways <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
