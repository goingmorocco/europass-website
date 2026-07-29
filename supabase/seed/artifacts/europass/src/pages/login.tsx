import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plane, Lock, Mail } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API delay
    setTimeout(() => {
      setIsLoading(false);
      
      if (email === "admin@europass.ma" && password === "admin123") {
        login("admin");
        toast({ title: "Welcome back, Admin." });
        setLocation("/admin");
      } else if (email === "student@europass.ma" && password === "student123") {
        login("student");
        toast({ title: "Welcome back!" });
        setLocation("/portal");
      } else {
        toast({ 
          title: "Invalid credentials", 
          description: "Please check your email and password.",
          variant: "destructive"
        });
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white p-8 rounded-3xl border border-border shadow-2xl">
          <div className="text-center mb-10">
            <Link href="/" className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-6 shadow-md hover:scale-105 transition-transform">
              <Plane className="h-8 w-8" />
            </Link>
            <h2 className="text-3xl font-display font-bold text-foreground">Welcome Back</h2>
            <p className="mt-2 text-sm text-muted-foreground">Sign in to your EuroPass account</p>
          </div>
          
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  type="email" 
                  placeholder="Email address" 
                  className="pl-10 h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  type="password" 
                  placeholder="Password" 
                  className="pl-10 h-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-border text-primary focus:ring-primary" />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <a href="#" className="font-medium text-primary hover:underline">Forgot password?</a>
            </div>

            <Button type="submit" size="lg" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold h-12" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground mb-4">Demo Credentials:</p>
            <div className="text-xs space-y-2 bg-muted p-4 rounded-lg text-left">
              <p><strong>Admin:</strong> admin@europass.ma / admin123</p>
              <p><strong>Student:</strong> student@europass.ma / student123</p>
            </div>
          </div>
        </div>
        
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Apply now
          </Link>
        </p>
      </div>
    </div>
  );
}
