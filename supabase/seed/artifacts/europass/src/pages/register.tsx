import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plane, ArrowRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useListCourses } from "@workspace/api-client-react";

export default function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: courses } = useListCourses({});

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API delay
    setTimeout(() => {
      setIsLoading(false);
      toast({ 
        title: "Application Received!", 
        description: "An advisor will contact you shortly to finalize your registration."
      });
      setLocation("/");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full">
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-border shadow-2xl">
          <div className="text-center mb-10">
            <Link href="/" className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-6 shadow-md hover:scale-105 transition-transform">
              <Plane className="h-8 w-8" />
            </Link>
            <h2 className="text-3xl font-display font-bold text-foreground">Start Your Journey</h2>
            <p className="mt-2 text-sm text-muted-foreground">Apply for a course or the Ausbildung program</p>
          </div>
          
          <form className="space-y-6" onSubmit={handleRegister}>
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2 sm:col-span-1 space-y-2">
                <label className="text-sm font-bold text-foreground">First Name</label>
                <Input placeholder="John" required className="h-12" />
              </div>
              <div className="col-span-2 sm:col-span-1 space-y-2">
                <label className="text-sm font-bold text-foreground">Last Name</label>
                <Input placeholder="Doe" required className="h-12" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Email Address</label>
              <Input type="email" placeholder="john@example.com" required className="h-12" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Phone Number</label>
              <Input type="tel" placeholder="+212 6..." required className="h-12" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Program of Interest</label>
              <Select required>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select a program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ausbildung">Ausbildung (Vocational Training in Germany)</SelectItem>
                  {courses?.map(course => (
                    <SelectItem key={course.id} value={course.id.toString()}>{course.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Current Language Level</label>
              <Select required>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None / Absolute Beginner</SelectItem>
                  <SelectItem value="a1">A1 (Beginner)</SelectItem>
                  <SelectItem value="a2">A2 (Elementary)</SelectItem>
                  <SelectItem value="b1">B1 (Intermediate)</SelectItem>
                  <SelectItem value="b2">B2 (Upper Intermediate)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4">
              <Button type="submit" size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-lg" disabled={isLoading}>
                {isLoading ? "Submitting..." : (
                  <>Submit Application <ArrowRight className="ml-2 h-5 w-5" /></>
                )}
              </Button>
            </div>
            
            <p className="text-xs text-center text-muted-foreground mt-4">
              By submitting this form, you agree to our <Link href="/terms" className="underline">Terms of Service</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
            </p>
          </form>
        </div>
        
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
