import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Sample } from "@/lib/store";
import { useLocation } from "wouter";

const formSchema = z.object({
  customer_name: z.string().min(2, "Name must be at least 2 characters"),
  customer_email: z.string().email("Invalid email address"),
  customer_phone: z.string().optional(),
  sample_name: z.string().min(2, "Sample name is required"),
  due_date: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
  auth_notes: z.string().optional(),
  stripe_customer_id: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SampleFormProps {
  initialData?: Sample;
  onSubmit: (data: Omit<Sample, 'id' | 'status' | 'checkout_date'>) => void;
  title: string;
}

export function SampleForm({ initialData, onSubmit, title }: SampleFormProps) {
  const [, setLocation] = useLocation();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      customer_name: initialData.customer_name,
      customer_email: initialData.customer_email,
      customer_phone: initialData.customer_phone || "",
      sample_name: initialData.sample_name,
      due_date: initialData.due_date,
      notes: initialData.notes || "",
      auth_notes: initialData.auth_notes || "",
      stripe_customer_id: initialData.stripe_customer_id || "",
    } : {
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      sample_name: "",
      due_date: format(new Date(), 'yyyy-MM-dd'),
      notes: "",
      auth_notes: "",
      stripe_customer_id: "",
    },
  });

  const handleSubmit = (data: FormValues) => {
    onSubmit(data);
    setLocation("/");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-serif font-bold text-primary">{title}</h2>
        <p className="text-muted-foreground">Enter the details for the sample checkout.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customer_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="jane@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="customer_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="555-0123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stripe_customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stripe Customer ID (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="cus_..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="sample_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sample Description</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Carrara Marble Hexagon" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="auth_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card / Authorization Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Auth code, payment link, or card last 4 digits." 
                        className="resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Do not store full credit card numbers here.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any additional context..." 
                        className="resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => setLocation("/")}>
                  Cancel
                </Button>
                <Button type="submit">Save Sample Checkout</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
