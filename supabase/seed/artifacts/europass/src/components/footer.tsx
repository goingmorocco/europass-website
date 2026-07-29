import { Link } from "wouter";
import { Plane, Facebook, Instagram, Linkedin, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground text-primary">
                <Plane className="h-6 w-6" />
              </div>
              <span className="font-display text-xl font-bold tracking-tight">
                EuroPass
              </span>
            </div>
            <p className="text-primary-foreground/70 text-sm max-w-xs">
              Your gateway to education and professional opportunities in Germany and across Europe. Based in Khemisset, Morocco.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-primary-foreground/70 hover:text-secondary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-primary-foreground/70 hover:text-secondary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-primary-foreground/70 hover:text-secondary transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-display font-semibold mb-4 text-lg">Programs</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link href="/courses?category=German" className="hover:text-secondary transition-colors">German Language</Link></li>
              <li><Link href="/courses?category=French" className="hover:text-secondary transition-colors">French Language</Link></li>
              <li><Link href="/ausbildung" className="hover:text-secondary transition-colors">Ausbildung Germany</Link></li>
              <li><Link href="/courses?category=Professional" className="hover:text-secondary transition-colors">Professional Training</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-semibold mb-4 text-lg">Company</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link href="/about" className="hover:text-secondary transition-colors">About Us</Link></li>
              <li><Link href="/teachers" className="hover:text-secondary transition-colors">Our Teachers</Link></li>
              <li><Link href="/blog" className="hover:text-secondary transition-colors">News & Blog</Link></li>
              <li><Link href="/contact" className="hover:text-secondary transition-colors">Careers</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-semibold mb-4 text-lg">Support</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link href="/faq" className="hover:text-secondary transition-colors">FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-secondary transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-secondary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-secondary transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-primary-foreground/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-primary-foreground/50">
            © {new Date().getFullYear()} EuroPass Language School. All rights reserved.
          </p>
          <p className="text-sm text-primary-foreground/50">
            Khemisset, Morocco
          </p>
        </div>
      </div>
    </footer>
  );
}
