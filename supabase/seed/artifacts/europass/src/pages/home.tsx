import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  CheckCircle2, 
  Globe2, 
  GraduationCap, 
  Briefcase, 
  MessageSquare,
  MapPin,
  Phone,
  Mail
} from "lucide-react";
import heroImg from "@assets/generated_images/hero-europass.jpg";
import ausbildungImg from "@assets/generated_images/ausbildung.jpg";
import { useListCourses, useListTestimonials, useListTeachers, useListBlogPosts } from "@workspace/api-client-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: courses, isLoading: loadingCourses } = useListCourses({ featured: true });
  const { data: testimonials, isLoading: loadingTestimonials } = useListTestimonials({ featured: true });
  const { data: blogPosts, isLoading: loadingBlogPosts } = useListBlogPosts({ limit: 3 });

  return (
    <div className="flex flex-col min-h-screen">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay">
          <img 
            src={heroImg} 
            alt="Students on a European campus" 
            className="w-full h-full object-cover object-center"
          />
        </div>
        <div className="relative z-10 container mx-auto px-4 py-24 sm:py-32 lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-block py-1 px-3 rounded-full bg-secondary/20 text-secondary font-medium text-sm mb-6 border border-secondary/30">
              Gateway to Europe
            </span>
            <h1 className="text-5xl sm:text-6xl font-display font-bold tracking-tight mb-6 leading-tight">
              Master Languages. <br />Unlock Europe.
            </h1>
            <p className="text-lg sm:text-xl text-primary-foreground/80 mb-8 max-w-xl leading-relaxed">
              EuroPass is Morocco's premier language school and professional training center. We prepare ambitious students for study, work, and the Ausbildung program in Germany.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold" asChild>
                <Link href="/register">Start Your Journey</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <Link href="/ausbildung">Explore Ausbildung</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST INDICATORS */}
      <section className="py-12 bg-white border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-border">
            <div className="px-4">
              <h3 className="text-3xl font-display font-bold text-primary mb-2">500+</h3>
              <p className="text-muted-foreground text-sm font-medium">Students Enrolled</p>
            </div>
            <div className="px-4">
              <h3 className="text-3xl font-display font-bold text-primary mb-2">100%</h3>
              <p className="text-muted-foreground text-sm font-medium">Certified Teachers</p>
            </div>
            <div className="px-4">
              <h3 className="text-3xl font-display font-bold text-primary mb-2">50+</h3>
              <p className="text-muted-foreground text-sm font-medium">Ausbildung Placements</p>
            </div>
            <div className="px-4">
              <h3 className="text-3xl font-display font-bold text-primary mb-2">A1-C1</h3>
              <p className="text-muted-foreground text-sm font-medium">Full Level Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE EUROPASS */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-primary mb-4">Why Choose EuroPass?</h2>
            <p className="text-muted-foreground text-lg">We don't just teach languages; we prepare you for a successful life and career in Europe.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-border shadow-sm hover-elevate">
              <div className="h-12 w-12 rounded-lg bg-primary/5 text-primary flex items-center justify-center mb-6">
                <Globe2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">European Standards</h3>
              <p className="text-muted-foreground leading-relaxed">Our curriculum is aligned with the CEFR, ensuring your certifications are recognized universally across Europe.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-border shadow-sm hover-elevate">
              <div className="h-12 w-12 rounded-lg bg-primary/5 text-primary flex items-center justify-center mb-6">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">Expert Instructors</h3>
              <p className="text-muted-foreground leading-relaxed">Learn from native speakers and highly qualified pedagogues who understand the specific challenges Moroccan students face.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-border shadow-sm hover-elevate">
              <div className="h-12 w-12 rounded-lg bg-primary/5 text-primary flex items-center justify-center mb-6">
                <Briefcase className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">Career Integration</h3>
              <p className="text-muted-foreground leading-relaxed">Beyond language, we offer intercultural coaching, interview prep, and direct pathways to German Ausbildung programs.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED COURSES */}
      <section className="py-24 bg-white border-t border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div className="max-w-2xl">
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-primary mb-4">Featured Courses</h2>
              <p className="text-muted-foreground text-lg">Intensive, goal-oriented programs designed to get you certified faster.</p>
            </div>
            <Button variant="ghost" className="group text-primary" asChild>
              <Link href="/courses">
                View All Courses <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loadingCourses ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex flex-col space-y-4">
                  <Skeleton className="h-48 rounded-xl" />
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))
            ) : courses && courses.length > 0 ? (
              courses.slice(0, 3).map((course) => (
                <Link key={course.id} href={`/courses/${course.slug}`} className="group flex flex-col bg-background rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-48 overflow-hidden bg-muted relative">
                    {course.imageUrl ? (
                      <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary font-display font-bold text-xl">
                        {course.language || course.category}
                      </div>
                    )}
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold text-primary">
                      {course.levels}
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="text-sm font-medium text-secondary mb-2">{course.category}</div>
                    <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors">{course.title}</h3>
                    <p className="text-muted-foreground text-sm line-clamp-2 mb-6 flex-1">{course.description}</p>
                    <div className="flex items-center justify-between text-sm font-medium mt-auto pt-4 border-t border-border">
                      <span className="text-foreground">{course.duration}</span>
                      <span className="text-primary flex items-center">
                        Details <ArrowRight className="ml-1 h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="col-span-full text-center text-muted-foreground py-12">No featured courses available at the moment.</p>
            )}
          </div>
        </div>
      </section>

      {/* AUSBILDUNG SPOTLIGHT */}
      <section className="py-24 bg-primary text-primary-foreground overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <span className="inline-block py-1 px-3 rounded-full bg-secondary/20 text-secondary font-medium text-sm border border-secondary/30">
                The German Dream
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold leading-tight">
                Your Pathway to <br/><span className="text-secondary">Ausbildung</span> in Germany
              </h2>
              <p className="text-lg text-primary-foreground/80 leading-relaxed">
                Germany needs skilled professionals. The Ausbildung system combines classroom learning with paid on-the-job training. EuroPass guides you through the entire process—from B1/B2 German certification to securing your contract.
              </p>
              
              <ul className="space-y-4">
                {[
                  "Intensive German preparation (B1/B2 level)",
                  "CV and cover letter translation to German standards",
                  "Interview preparation and cultural coaching",
                  "Direct connections with German partner companies"
                ].map((item, i) => (
                  <li key={i} className="flex items-start">
                    <CheckCircle2 className="h-6 w-6 text-secondary mr-3 flex-shrink-0" />
                    <span className="text-primary-foreground/90">{item}</span>
                  </li>
                ))}
              </ul>
              
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold w-full sm:w-auto" asChild>
                <Link href="/ausbildung">Learn More About Ausbildung</Link>
              </Button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-secondary rounded-2xl transform translate-x-4 translate-y-4 opacity-50"></div>
              <img 
                src={ausbildungImg} 
                alt="Vocational training in Germany" 
                className="relative z-10 rounded-2xl shadow-2xl object-cover w-full aspect-[4/3]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* LATEST BLOG POSTS */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div className="max-w-2xl">
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-primary mb-4">News & Insights</h2>
              <p className="text-muted-foreground text-lg">Tips for learning, living abroad, and school updates.</p>
            </div>
            <Button variant="ghost" className="group text-primary" asChild>
              <Link href="/blog">
                Read the Blog <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {loadingBlogPosts ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-48 rounded-xl" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))
            ) : blogPosts && blogPosts.length > 0 ? (
              blogPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.id}`} className="group block space-y-4">
                  <div className="aspect-[16/9] rounded-xl overflow-hidden bg-muted border border-border">
                    {post.featuredImageUrl && (
                      <img src={post.featuredImageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-xs font-medium text-muted-foreground space-x-4">
                      <span className="text-secondary">{post.category}</span>
                      <span>{post.readingTime} min read</span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {post.excerpt}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <p className="col-span-full text-center text-muted-foreground py-12">No recent news.</p>
            )}
          </div>
        </div>
      </section>

      {/* CONTACT & MAP */}
      <section className="py-24 bg-white border-t border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-primary mb-6">Ready to Start?</h2>
              <p className="text-muted-foreground text-lg mb-8">
                Visit us at our Khemisset center or reach out via WhatsApp. Our advisors are ready to help you choose the right path.
              </p>
              
              <div className="space-y-6 mb-8">
                <div className="flex items-start">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-4 flex-shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">Our Location</h4>
                    <p className="text-muted-foreground">Avenue Mohammed V, Khemisset, Morocco</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-4 flex-shrink-0">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">Phone / WhatsApp</h4>
                    <p className="text-muted-foreground">+212 600-000000</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-4 flex-shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">Email</h4>
                    <p className="text-muted-foreground">contact@europass.ma</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-[#25D366] hover:bg-[#128C7E] text-white" asChild>
                  <a href="https://wa.me/212600000000" target="_blank" rel="noreferrer">
                    <MessageSquare className="mr-2 h-5 w-5" /> Chat on WhatsApp
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/contact">Send a Message</Link>
                </Button>
              </div>
            </div>
            
            <div className="h-[400px] rounded-2xl overflow-hidden border border-border shadow-sm">
              <iframe 
                width="100%" 
                height="100%" 
                frameBorder="0" 
                scrolling="no" 
                marginHeight={0} 
                marginWidth={0} 
                src="https://www.openstreetmap.org/export/embed.html?bbox=-6.1,-6.06&layer=mapnik&marker=33.824,-5.892" 
                title="EuroPass Location"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
