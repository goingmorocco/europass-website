import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, GraduationCap, Target, Users } from "lucide-react";
import aboutImg from "@assets/generated_images/about-europass.jpg";

export default function About() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* HEADER */}
      <section className="bg-primary py-24 text-primary-foreground">
        <div className="container mx-auto px-4 lg:px-8 text-center max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-display font-bold mb-6">About EuroPass</h1>
          <p className="text-lg sm:text-xl text-primary-foreground/80">
            We are a premium language school and professional training center in Khemisset, Morocco, dedicated to opening doors to Europe.
          </p>
        </div>
      </section>

      {/* STORY SECTION */}
      <section className="py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute inset-0 bg-secondary/20 rounded-2xl transform -translate-x-4 translate-y-4"></div>
              <img 
                src={aboutImg} 
                alt="EuroPass Center" 
                className="relative z-10 rounded-2xl shadow-xl w-full aspect-[4/3] object-cover"
              />
            </div>
            <div className="space-y-6">
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-primary">Our Story</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Founded with a clear vision, EuroPass was established to bridge the gap between Moroccan talent and European opportunities. We recognized that while many students dreamed of studying or working abroad, they lacked the structured guidance and rigorous linguistic preparation required.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Today, we stand as Khemisset's most trusted institution for German and French language certification. Our approach goes beyond textbooks; we immerse our students in the culture, expectations, and professional standards of their destination countries.
              </p>
              <div className="pt-6">
                <Button asChild size="lg">
                  <Link href="/contact">Visit Our Center</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MISSION & VALUES */}
      <section className="py-24 bg-white border-y border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-display font-bold text-primary mb-4">Our Core Values</h2>
            <p className="text-muted-foreground text-lg">The principles that guide our teaching and operations.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 bg-background rounded-2xl border border-border">
              <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Excellence</h3>
              <p className="text-muted-foreground text-sm">We maintain the highest pedagogical standards, ensuring our students pass their official language exams on the first try.</p>
            </div>
            <div className="p-6 bg-background rounded-2xl border border-border">
              <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Community</h3>
              <p className="text-muted-foreground text-sm">We foster a supportive environment where students motivate each other and alumni share their success stories.</p>
            </div>
            <div className="p-6 bg-background rounded-2xl border border-border">
              <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Practicality</h3>
              <p className="text-muted-foreground text-sm">Our lessons focus on real-world communication and vocabulary specific to study and work environments.</p>
            </div>
            <div className="p-6 bg-background rounded-2xl border border-border">
              <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Empowerment</h3>
              <p className="text-muted-foreground text-sm">We don't just process applications; we empower students with the independence to thrive abroad.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-3xl font-display font-bold text-primary mb-6">Ready to join our community?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Take the first step towards your European ambition. Browse our courses or speak with an advisor today.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/courses">Explore Courses</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/contact">Contact an Advisor</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
