import { useListFaqs } from "@workspace/api-client-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Faq() {
  const { data: faqs, isLoading } = useListFaqs();

  // Group FAQs by category
  const faqsByCategory = faqs?.reduce((acc, faq) => {
    const cat = faq.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {} as Record<string, typeof faqs>);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <section className="bg-primary py-24 text-primary-foreground">
        <div className="container mx-auto px-4 lg:px-8 text-center max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-display font-bold mb-6">Frequently Asked Questions</h1>
          <p className="text-lg sm:text-xl text-primary-foreground/80">
            Everything you need to know about our courses, the Ausbildung process, and visas.
          </p>
        </div>
      </section>

      <section className="py-24">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-8 w-1/4 mb-4" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : faqsByCategory && Object.keys(faqsByCategory).length > 0 ? (
            Object.entries(faqsByCategory).map(([category, items]) => (
              <div key={category} className="mb-16 last:mb-0">
                <h2 className="text-2xl font-display font-bold text-primary mb-6 border-b border-border pb-2">{category}</h2>
                <Accordion type="multiple" className="w-full bg-white rounded-2xl border border-border px-6 shadow-sm">
                  {items.map((faq) => (
                    <AccordionItem key={faq.id} value={`faq-${faq.id}`} className="border-border">
                      <AccordionTrigger className="text-left font-bold text-lg hover:text-primary transition-colors py-6">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No FAQs available right now.</p>
            </div>
          )}

          <div className="mt-24 text-center bg-muted/50 p-12 rounded-3xl border border-border">
            <h3 className="text-2xl font-display font-bold mb-4">Still have questions?</h3>
            <p className="text-muted-foreground mb-8">We are here to help. Reach out to our advisory team directly.</p>
            <Button size="lg" asChild>
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
