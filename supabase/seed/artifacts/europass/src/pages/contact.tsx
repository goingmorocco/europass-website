import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateInquiry } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Phone, Mail, MessageSquare } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().optional(),
  type: z.string().min(1, "Please select an inquiry type."),
  message: z.string().min(10, "Message must be at least 10 characters."),
});

type FormValues = z.infer<typeof formSchema>;

export default function Contact() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createInquiry = useCreateInquiry();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      type: "General Inquiry",
      message: "",
    },
  });

  function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    createInquiry.mutate(
      { data },
      {
        onSuccess: () => {
          setIsSubmitting(false);
          toast({
            title: "Message Sent!",
            description: "We'll get back to you as soon as possible.",
          });
          form.reset();
        },
        onError: () => {
          setIsSubmitting(false);
          toast({
            title: "Error",
            description: "Something went wrong. Please try again later.",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* HEADER */}
      <section className="bg-primary py-24 text-primary-foreground">
        <div className="container mx-auto px-4 lg:px-8 text-center max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-display font-bold mb-6">Contact Us</h1>
          <p className="text-lg sm:text-xl text-primary-foreground/80">
            Have questions about our courses, Ausbildung, or the application process? We're here to help.
          </p>
        </div>
      </section>

      <section className="py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            
            {/* CONTACT INFO */}
            <div>
              <h2 className="text-3xl font-display font-bold text-primary mb-6">Get in Touch</h2>
              <p className="text-muted-foreground text-lg mb-12">
                Visit our language center in Khemisset or reach out digitally. We respond to all inquiries within 24 hours.
              </p>

              <div className="space-y-8 mb-12">
                <div className="flex items-start">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mr-6 flex-shrink-0">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2">Visit Us</h4>
                    <p className="text-muted-foreground">Avenue Mohammed V<br/>Khemisset, Morocco</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mr-6 flex-shrink-0">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2">Call Us</h4>
                    <p className="text-muted-foreground">+212 600-000000<br/>Mon-Fri, 9:00 - 18:00</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mr-6 flex-shrink-0">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2">Email Us</h4>
                    <p className="text-muted-foreground">contact@europass.ma<br/>admissions@europass.ma</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#25D366]/10 p-6 rounded-2xl border border-[#25D366]/20">
                <h4 className="font-bold text-xl mb-2 flex items-center text-[#128C7E]">
                  <MessageSquare className="w-5 h-5 mr-2" /> Prefer WhatsApp?
                </h4>
                <p className="text-muted-foreground mb-4">Chat with our advisors instantly for quick answers.</p>
                <Button className="bg-[#25D366] hover:bg-[#128C7E] text-white" asChild>
                  <a href="https://wa.me/212600000000" target="_blank" rel="noreferrer">
                    Start Chat
                  </a>
                </Button>
              </div>
            </div>

            {/* CONTACT FORM */}
            <div className="bg-white p-8 lg:p-12 rounded-3xl border border-border shadow-xl">
              <h3 className="text-2xl font-display font-bold mb-8">Send a Message</h3>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="col-span-2 md:col-span-1">
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem className="col-span-2 md:col-span-1">
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+212 6..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inquiry Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an inquiry type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Course Enrollment">Course Enrollment</SelectItem>
                            <SelectItem value="Ausbildung Inquiry">Ausbildung Inquiry</SelectItem>
                            <SelectItem value="Visa Assistance">Visa Assistance</SelectItem>
                            <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="How can we help you?" 
                            className="min-h-[150px] resize-none"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" size="lg" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold" disabled={isSubmitting}>
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
