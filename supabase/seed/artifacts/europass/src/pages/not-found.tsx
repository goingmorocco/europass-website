import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Plane } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-background px-4 text-center">
      <div className="h-20 w-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-8">
        <Plane className="h-10 w-10" />
      </div>
      <h1 className="text-6xl font-display font-bold text-foreground mb-4">404</h1>
      <h2 className="text-2xl font-bold text-muted-foreground mb-8">Page Not Found</h2>
      <p className="text-muted-foreground max-w-md mb-10">
        The page you are looking for doesn't exist or has been moved. 
        Let's get you back on track.
      </p>
      <Button size="lg" asChild>
        <Link href="/">Return to Homepage</Link>
      </Button>
    </div>
  );
}
