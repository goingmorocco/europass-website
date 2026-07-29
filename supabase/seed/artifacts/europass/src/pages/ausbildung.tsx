import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Factory, GraduationCap, Map, Users, ArrowRight, Euro } from "lucide-react";
import ausbildungImg from "@assets/generated_images/ausbildung.jpg";

export default function Ausbildung() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* HERO */}
      <section className="bg-primary text-primary-foreground pt-24 pb-32">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="inline-block py-1 px-3 rounded-full bg-secondary/20 text-secondary font-medium text-sm border border-secondary/30">
                Vocational Training
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight">
                Ausbildung in Germany
              </h1>
              <p className="text-lg sm:text-xl text-primary-foreground/80 leading-relaxed max-w-xl">
                The dual vocational training system that pays you to learn. Secure your future in Europe's strongest economy with the guidance of EuroPass.
              </p>
              <div className="flex gap-4 pt-4">
                <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold" asChild>
                  <Link href="/register">Apply Now</Link>
                </Button>
              </div>
            </div>
            <div className="relative mt-8 lg:mt-0">
              <div className="absolute inset-0 bg-secondary rounded-2xl transform translate-x-4 translate-y-4 opacity-50"></div>
              <img 
                src={ausbildungImg} 
                alt="Ausbildung in Germany" 
                className="relative z-10 rounded-2xl shadow-2xl object-cover w-full aspect-[4/3]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* WHAT IS IT */}
      <section className="py-24 -mt-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="bg-white rounded-3xl p-8 lg:p-12 shadow-xl border border-border">
            <div className="grid md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Factory className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Dual System</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Combine theory and practice. Spend 70% of your time working at a company and 30% learning at a vocational school.
                </p>
              </div>
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Euro className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Earn While Learning</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Receive a monthly training salary from day one. You are an employee, not just a student, ensuring financial independence.
                </p>
              </div>
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Guaranteed Future</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Over 90% of graduates receive a permanent job offer from their training company upon successful completion.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REQUIREMENTS */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-primary mb-4">What You Need to Succeed</h2>
            <p className="text-muted-foreground text-lg">The German system is highly structured. Here is what is expected of applicants.</p>
          </div>

          <div className="space-y-6">
            <div className="flex bg-white p-6 rounded-2xl border border-border shadow-sm items-start gap-6">
              <div className="flex-shrink-0 h-16 w-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-display font-bold text-xl">1</div>
              <div>
                <h3 className="text-xl font-bold mb-2">B2 Level German</h3>
                <p className="text-muted-foreground">You must have an official Goethe, ÖSD, or TELC B1/B2 certificate. The school and workplace operate entirely in German.</p>
              </div>
            </div>
            <div className="flex bg-white p-6 rounded-2xl border border-border shadow-sm items-start gap-6">
              <div className="flex-shrink-0 h-16 w-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-display font-bold text-xl">2</div>
              <div>
                <h3 className="text-xl font-bold mb-2">High School Diploma (Baccalauréat)</h3>
                <p className="text-muted-foreground">A recognized high school diploma translated into German. Good grades in subjects relevant to your desired profession are a plus.</p>
              </div>
            </div>
            <div className="flex bg-white p-6 rounded-2xl border border-border shadow-sm items-start gap-6">
              <div className="flex-shrink-0 h-16 w-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-display font-bold text-xl">3</div>
              <div>
                <h3 className="text-xl font-bold mb-2">Strong Motivation</h3>
                <p className="text-muted-foreground">Companies hire for attitude and train for skill. A well-crafted cover letter and excellent interview preparation are essential.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW WE HELP */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-primary mb-6">How EuroPass Helps You</h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                Navigating the German bureaucracy from Morocco can be daunting. We provide end-to-end support to ensure your application stands out.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  "Intensive language courses from A1 to B2",
                  "Goethe-Institut exam preparation",
                  "CV and motivation letter formatting (German standard)",
                  "Mock interviews in German with native speakers",
                  "Visa application assistance",
                  "Connection to partner networks in Germany"
                ].map((item, i) => (
                  <li key={i} className="flex items-start">
                    <CheckCircle2 className="h-6 w-6 text-primary mr-3 flex-shrink-0" />
                    <span className="text-foreground font-medium">{item}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" asChild>
                <Link href="/contact">Book a Consultation</Link>
              </Button>
            </div>
            <div className="bg-primary p-12 rounded-3xl text-primary-foreground">
              <h3 className="text-2xl font-display font-bold mb-6">Popular Ausbildung Sectors</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="font-bold text-secondary mb-1">Healthcare</h4>
                  <p className="text-primary-foreground/80 text-sm">Nursing (Pflegefachmann/frau) is highly demanded with excellent career prospects.</p>
                </div>
                <div className="h-px w-full bg-primary-foreground/20"></div>
                <div>
                  <h4 className="font-bold text-secondary mb-1">IT & Technology</h4>
                  <p className="text-primary-foreground/80 text-sm">IT Specialist (Fachinformatiker) and Mechatronics are high-paying options.</p>
                </div>
                <div className="h-px w-full bg-primary-foreground/20"></div>
                <div>
                  <h4 className="font-bold text-secondary mb-1">Hospitality</h4>
                  <p className="text-primary-foreground/80 text-sm">Hotel management and culinary arts offer international mobility.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
