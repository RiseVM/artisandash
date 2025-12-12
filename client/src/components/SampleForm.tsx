import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useCustomers, useInventory, useCreateCustomer, useCreateInventory, useCreateCheckout, useUpdateCustomer } from "@/hooks/use-api";
import type { Checkout } from "@shared/schema";
import { useLocation } from "wouter";
import { Calendar, Check, ChevronsUpDown, CreditCard, Lock, Loader2, Plus, PenLine, RotateCcw } from "lucide-react";
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
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import SignatureCanvas from "react-signature-canvas";

const formSchema = z.object({
  customer_id: z.number({ required_error: "Please select a customer" }),
  inventory_item_ids: z.array(z.number()).min(1, "Please select at least one sample"),
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
  const { data: customers = [] } = useCustomers();
  const { data: inventory = [] } = useInventory();
  const createCustomerMutation = useCreateCustomer();
  const createInventoryMutation = useCreateInventory();
  const updateCustomerMutation = useUpdateCustomer();
  const { toast } = useToast();
  
  const [customerOpen, setCustomerOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);

  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [showNewItemDialog, setShowNewItemDialog] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: "", email: "", phone: "" });
  const [newItemData, setNewItemData] = useState({ name: "", sku: "", category: "" });

  const [isProcessingCard, setIsProcessingCard] = useState(false);
  const [cardVerified, setCardVerified] = useState(!!initialData?.auth_notes);

  const signatureRef = useRef<SignatureCanvas>(null);
  const [hasSignature, setHasSignature] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      customer_id: initialData.customer_id,
      inventory_item_ids: [initialData.inventory_item_id],
      due_date: initialData.due_date,
      notes: initialData.notes || "",
      auth_notes: initialData.auth_notes || "",
      payment_agreement: true,
    } : {
      customer_id: undefined,
      inventory_item_ids: [],
      due_date: format(new Date(), 'yyyy-MM-dd'),
      notes: "",
      auth_notes: "",
      payment_agreement: false,
    },
  });

  const selectedItemIds = form.watch("inventory_item_ids");
  const selectedCustomerId = form.watch("customer_id");

  useEffect(() => {
    if (selectedCustomerId && !initialData) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer?.card_last4) {
        setCardVerified(true);
        form.setValue("auth_notes", `Card on file (${customer.card_brand || 'Card'} ending in ${customer.card_last4})`);
      } else {
        setCardVerified(false);
        form.setValue("auth_notes", "");
      }
    }
  }, [selectedCustomerId, customers, initialData]);

  const addItemToList = (itemId: number) => {
    const current = form.getValues("inventory_item_ids");
    if (!current.includes(itemId)) {
      form.setValue("inventory_item_ids", [...current, itemId]);
    }
    setItemOpen(false);
  };

  const removeItemFromList = (itemId: number) => {
    const current = form.getValues("inventory_item_ids");
    form.setValue("inventory_item_ids", current.filter(id => id !== itemId));
  };

  const paymentAgreement = form.watch("payment_agreement");

  const handleChargeCard = async () => {
    if (!paymentAgreement) {
      toast({
        title: "Agreement Required",
        description: "Please agree to the sample policy before processing payment.",
        variant: "destructive",
      });
      return;
    }
    if (!hasSignature) {
      toast({
        title: "Signature Required",
        description: "Please sign the agreement before processing payment.",
        variant: "destructive",
      });
      return;
    }
    
    const customerId = form.getValues("customer_id");
    if (!customerId) {
      toast({
        title: "Customer Required",
        description: "Please select a customer before processing payment.",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessingCard(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await updateCustomerMutation.mutateAsync({
        id: customerId,
        data: {
          card_last4: "4242",
          card_brand: "Visa",
          card_exp_month: "12",
          card_exp_year: "2028",
        }
      });
      
      setCardVerified(true);
      form.setValue("auth_notes", `Card on file (Ending in 4242)`);
      toast({
        title: "Card Verified",
        description: "Card saved to customer file for sample checkout.",
      });
    } catch (err) {
      toast({
        title: "Payment Failed",
        description: "Could not process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingCard(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerData.name || !newCustomerData.email) {
      toast({ title: "Required Fields", description: "Name and email are required.", variant: "destructive" });
      return;
    }
    const newC = await createCustomerMutation.mutateAsync({ 
      name: newCustomerData.name, 
      email: newCustomerData.email, 
      phone: newCustomerData.phone || null,
    });
    form.setValue("customer_id", newC.id);
    setShowNewCustomerDialog(false);
    setNewCustomerData({ name: "", email: "", phone: "" });
    toast({ title: "Customer Created", description: `${newC.name} added and selected.` });
  };

  const handleCreateItem = async () => {
    if (!newItemData.name) {
      toast({ title: "Required Fields", description: "Item name is required.", variant: "destructive" });
      return;
    }
    const newI = await createInventoryMutation.mutateAsync({ 
      name: newItemData.name, 
      sku: newItemData.sku || null, 
      category: newItemData.category || null,
      total_quantity: 1 
    });
    addItemToList(newI.id);
    setShowNewItemDialog(false);
    setNewItemData({ name: "", sku: "", category: "" });
    toast({ title: "Item Created", description: `${newI.name} added to checkout.` });
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
    setHasSignature(false);
  };

  const handleSignatureEnd = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      setHasSignature(true);
    }
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
    if (!hasSignature && !initialData) {
      toast({
        title: "Signature Required",
        description: "Please sign to acknowledge the sample policy.",
        variant: "destructive",
      });
      return;
    }
    
    const signatureData = signatureRef.current?.toDataURL() || "";
    onSubmit({ ...data, signature: signatureData });
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
                      <div className="flex gap-2">
                        <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "flex-1 justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="select-customer"
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
                                  <p className="text-sm text-muted-foreground p-2">No customer found.</p>
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
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon"
                          onClick={() => setShowNewCustomerDialog(true)}
                          title="Add new customer"
                          data-testid="button-new-customer"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>

              <FormField
                control={form.control}
                name="inventory_item_ids"
                render={() => (
                  <FormItem>
                    <FormLabel>Sample Items</FormLabel>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Popover open={itemOpen} onOpenChange={setItemOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              className="flex-1 justify-between text-muted-foreground"
                              data-testid="select-item"
                            >
                              Add a sample...
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0">
                            <Command>
                              <CommandInput placeholder="Search inventory..." />
                              <CommandList>
                                <CommandEmpty>
                                  <p className="text-sm text-muted-foreground p-2">Item not found.</p>
                                </CommandEmpty>
                                <CommandGroup>
                                  {inventory
                                    .filter(item => !selectedItemIds.includes(item.id))
                                    .map((item) => (
                                      <CommandItem
                                        value={item.name}
                                        key={item.id}
                                        onSelect={() => addItemToList(item.id)}
                                      >
                                        <Plus className="mr-2 h-4 w-4" />
                                        {item.name}
                                        {item.sku && <span className="ml-2 text-xs text-muted-foreground">({item.sku})</span>}
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon"
                          onClick={() => setShowNewItemDialog(true)}
                          title="Add new item"
                          data-testid="button-new-item"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {selectedItemIds.length > 0 && (
                        <div className="rounded-md border divide-y">
                          {selectedItemIds.map((itemId) => {
                            const item = inventory.find(i => i.id === itemId);
                            return (
                              <div key={itemId} className="flex items-center justify-between p-3" data-testid={`selected-item-${itemId}`}>
                                <div>
                                  <span className="font-medium">{item?.name || "Unknown"}</span>
                                  {item?.sku && <span className="ml-2 text-xs text-muted-foreground">({item.sku})</span>}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItemFromList(itemId)}
                                  className="text-destructive hover:text-destructive"
                                  data-testid={`remove-item-${itemId}`}
                                >
                                  Remove
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {selectedItemIds.length === 0 && (
                        <p className="text-sm text-muted-foreground">No samples selected. Add at least one sample above.</p>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input type="date" className="pl-10" {...field} data-testid="input-due-date" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="payment_agreement"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-amber-50 dark:bg-amber-950">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-agreement"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I agree to the sample policy and authorize storing my card on file
                      </FormLabel>
                      <FormDescription>
                        I authorize Artisan Tile to store my card on file and charge it for the full retail price of the sample if it is not returned by the due date or is returned damaged.
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <PenLine className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Customer Signature</h3>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={clearSignature}
                    data-testid="button-clear-signature"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
                
                <div className="border-2 border-dashed rounded-lg bg-white touch-none" style={{ height: '200px' }}>
                  <SignatureCanvas
                    ref={signatureRef}
                    canvasProps={{
                      className: 'w-full h-full rounded-lg',
                      style: { width: '100%', height: '100%', touchAction: 'none' }
                    }}
                    onEnd={handleSignatureEnd}
                    penColor="black"
                    data-testid="signature-canvas"
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Sign above using your finger or stylus to acknowledge the sample policy.
                </p>
                {hasSignature && (
                  <div className="flex items-center justify-center gap-1 mt-2 text-green-600 text-sm">
                    <Check className="h-4 w-4" />
                    Signature captured
                  </div>
                )}
                {!hasSignature && paymentAgreement && (
                  <p className="text-xs text-center text-amber-600 mt-2">
                    Please sign above before proceeding to payment.
                  </p>
                )}
              </div>

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
                        data-testid="input-card-number"
                        onChange={(e) => {
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
                      <Input placeholder="MM / YY" className="font-mono text-center" maxLength={7} data-testid="input-card-exp" />
                      <Input placeholder="CVC" className="font-mono text-center" maxLength={4} type="password" data-testid="input-card-cvc" />
                      <Input placeholder="Zip Code" className="font-mono text-center" maxLength={5} data-testid="input-card-zip" />
                    </div>

                    <Button 
                      type="button" 
                      className="w-full" 
                      onClick={handleChargeCard}
                      disabled={isProcessingCard || !paymentAgreement || !hasSignature}
                      data-testid="button-charge-card"
                    >
                      {isProcessingCard ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving Card...
                        </>
                      ) : (
                        "Save Card on File"
                      )}
                    </Button>
                    {!paymentAgreement && (
                      <p className="text-xs text-center text-amber-600">
                        Please agree to the sample policy above to enable payment processing.
                      </p>
                    )}
                    {paymentAgreement && !hasSignature && (
                      <p className="text-xs text-center text-amber-600">
                        Please sign the agreement above before processing payment.
                      </p>
                    )}
                    <p className="text-xs text-center text-muted-foreground">
                      Your card will be stored securely in case of issues with sample return.
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-green-700 font-medium mb-1">
                      <Check className="h-5 w-5" />
                      Card on File
                    </div>
                    <p className="text-sm text-green-600">
                      {(() => {
                        const customer = customers.find(c => c.id === selectedCustomerId);
                        if (customer?.card_last4) {
                          return `${customer.card_brand || 'Card'} ending in ${customer.card_last4} is securely stored.`;
                        }
                        return "Card is securely stored on file.";
                      })()}
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any additional context..." 
                        className="resize-none"
                        {...field}
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => setLocation("/")} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit">
                  {initialData ? "Update Checkout" : "Complete Checkout"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Name</Label>
              <Input 
                className="col-span-3" 
                value={newCustomerData.name} 
                onChange={(e) => setNewCustomerData({...newCustomerData, name: e.target.value})}
                data-testid="input-inline-customer-name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Email</Label>
              <Input 
                className="col-span-3" 
                value={newCustomerData.email} 
                onChange={(e) => setNewCustomerData({...newCustomerData, email: e.target.value})}
                data-testid="input-inline-customer-email"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Phone</Label>
              <Input 
                className="col-span-3" 
                value={newCustomerData.phone} 
                onChange={(e) => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                data-testid="input-inline-customer-phone"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCustomerDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateCustomer} disabled={createCustomerMutation.isPending} data-testid="button-save-inline-customer">
              {createCustomerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewItemDialog} onOpenChange={setShowNewItemDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Sample Item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Name</Label>
              <Input 
                className="col-span-3" 
                value={newItemData.name} 
                onChange={(e) => setNewItemData({...newItemData, name: e.target.value})}
                data-testid="input-inline-item-name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">SKU</Label>
              <Input 
                className="col-span-3" 
                value={newItemData.sku} 
                onChange={(e) => setNewItemData({...newItemData, sku: e.target.value})}
                data-testid="input-inline-item-sku"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Category</Label>
              <Input 
                className="col-span-3" 
                value={newItemData.category} 
                onChange={(e) => setNewItemData({...newItemData, category: e.target.value})}
                data-testid="input-inline-item-category"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewItemDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateItem} disabled={createInventoryMutation.isPending} data-testid="button-save-inline-item">
              {createInventoryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
