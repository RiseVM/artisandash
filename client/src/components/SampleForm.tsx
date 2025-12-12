import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Card, CardContent } from "@/components/ui/card";
import { useStore, Checkout } from "@/lib/store";
import { useLocation } from "wouter";
import { Check, ChevronsUpDown, CreditCard, Lock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  customer_id: z.number({ required_error: "Please select a customer" }),
  inventory_item_id: z.number({ required_error: "Please select a sample" }),
  due_date: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
  auth_notes: z.string().optional(),
  payment_agreement: z.boolean().default(false).refine((val) => val === true, {
    message: "You must agree to the sample policy terms.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface SampleFormProps {
  initialData?: Checkout;
  onSubmit: (data: any) => void;
  title: string;
}

export function SampleForm({ initialData, onSubmit, title }: SampleFormProps) {
  const [, setLocation] = useLocation();
  const { customers, inventory, addCustomer, addInventoryItem } = useStore();
  const { toast } = useToast();
  
  // Combobox states
  const [customerOpen, setCustomerOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);

  // Mock Payment State
  const [isProcessingCard, setIsProcessingCard] = useState(false);
  const [cardVerified, setCardVerified] = useState(!!initialData?.auth_notes);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      customer_id: initialData.customer_id,
      inventory_item_id: initialData.inventory_item_id,
      due_date: initialData.due_date,
      notes: initialData.notes || "",
      auth_notes: initialData.auth_notes || "",
      payment_agreement: true,
    } : {
      customer_id: undefined,
      inventory_item_id: undefined,
      due_date: format(new Date(), 'yyyy-MM-dd'),
      notes: "",
      auth_notes: "",
      payment_agreement: false,
    },
  });

  const handleChargeCard = () => {
    setIsProcessingCard(true);
    // Simulate API call
    setTimeout(() => {
      setIsProcessingCard(false);
      setCardVerified(true);
      form.setValue("auth_notes", `Verified Card (Ending in 4242) - charged $1.00`);
      toast({
        title: "Card Verified",
        description: "$1.00 sample fee processed successfully.",
      });
    }, 1500);
  };

  const handleSubmit = (data: FormValues) => {
    if (!cardVerified && !initialData) {
      toast({
        title: "Payment Required",
        description: "Please verify a card to proceed with checkout.",
        variant: "destructive",
      });
      return;
    }
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
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Customer</FormLabel>
                      <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? customers.find(
                                    (customer) => customer.id === field.value
                                  )?.name
                                : "Select customer"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[250px] p-0">
                          <Command>
                            <CommandInput placeholder="Search customer..." />
                            <CommandList>
                              <CommandEmpty>
                                <div className="p-2">
                                  <p className="text-sm text-muted-foreground mb-2">No customer found.</p>
                                  <Button 
                                    size="sm" 
                                    className="w-full"
                                    onClick={() => {
                                      // Quick create stub - ideally would open a modal
                                      const name = prompt("Enter new customer name:");
                                      if(name) {
                                        const newC = addCustomer({ name, email: "pending@email.com" });
                                        form.setValue("customer_id", newC.id);
                                        setCustomerOpen(false);
                                      }
                                    }}
                                  >
                                    + Create New
                                  </Button>
                                </div>
                              </CommandEmpty>
                              <CommandGroup>
                                {customers.map((customer) => (
                                  <CommandItem
                                    value={customer.name}
                                    key={customer.id}
                                    onSelect={() => {
                                      form.setValue("customer_id", customer.id);
                                      setCustomerOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        customer.id === field.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {customer.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="inventory_item_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Sample Item</FormLabel>
                      <Popover open={itemOpen} onOpenChange={setItemOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? inventory.find(
                                    (item) => item.id === field.value
                                  )?.name
                                : "Select sample"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[250px] p-0">
                          <Command>
                            <CommandInput placeholder="Search inventory..." />
                            <CommandList>
                              <CommandEmpty>
                                <div className="p-2">
                                  <p className="text-sm text-muted-foreground mb-2">Item not found.</p>
                                  <Button 
                                    size="sm" 
                                    className="w-full"
                                    onClick={() => {
                                      const name = prompt("Enter new item name:");
                                      if(name) {
                                        const newI = addInventoryItem({ name, total_quantity: 1 });
                                        form.setValue("inventory_item_id", newI.id);
                                        setItemOpen(false);
                                      }
                                    }}
                                  >
                                    + Create New
                                  </Button>
                                </div>
                              </CommandEmpty>
                              <CommandGroup>
                                {inventory.map((item) => (
                                  <CommandItem
                                    value={item.name}
                                    key={item.id}
                                    onSelect={() => {
                                      form.setValue("inventory_item_id", item.id);
                                      setItemOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        item.id === field.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {item.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              {/* Secure Payment Section */}
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                   <Lock className="h-4 w-4 text-green-600" />
                   <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Secure Payment Method</h3>
                </div>

                {!cardVerified ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Card number" 
                        className="pl-9 font-mono"
                        maxLength={19}
                        onChange={(e) => {
                          // Simple formatting for visual effect
                          let v = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
                          let matches = v.match(/\d{4,16}/g);
                          let match = matches && matches[0] || ''
                          let parts = []
                          for (let i=0, len=match.length; i<len; i+=4) {
                            parts.push(match.substring(i, i+4))
                          }
                          if (parts.length) {
                            e.target.value = parts.join(' ')
                          } else {
                            e.target.value = v
                          }
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <Input placeholder="MM / YY" className="font-mono text-center" maxLength={5} />
                      <Input placeholder="CVC" className="font-mono text-center" maxLength={3} type="password" />
                      <Input placeholder="Zip Code" className="font-mono text-center" maxLength={5} />
                    </div>

                    <Button 
                      type="button" 
                      className="w-full" 
                      onClick={handleChargeCard}
                      disabled={isProcessingCard}
                    >
                      {isProcessingCard ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing $1.00 Charge...
                        </>
                      ) : (
                        "Charge $1.00 Fee & Verify Card"
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      This will securely save the card for future charges if the sample is not returned.
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-green-700 font-medium mb-1">
                      <Check className="h-5 w-5" />
                      Card Verified
                    </div>
                    <p className="text-sm text-green-600">
                      $1.00 fee collected. Card ending in 4242 is securely stored.
                    </p>
                    <Button 
                      variant="link" 
                      className="text-xs text-muted-foreground h-auto p-0 mt-2"
                      onClick={() => {
                        setCardVerified(false);
                        form.setValue("auth_notes", "");
                      }}
                    >
                      Use a different card
                    </Button>
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="payment_agreement"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I agree to the sample policy
                      </FormLabel>
                      <FormDescription>
                        I understand that a $1.00 fee has been charged. I authorize Artisan Tile to charge this card for the full retail price of the sample if it is not returned by the due date or is returned damaged.
                      </FormDescription>
                      <FormMessage />
                    </div>
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
                <Button type="submit" disabled={!cardVerified}>Save Sample Checkout</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
