import { useCreateCheckout } from "@/hooks/use-api";
import { SampleForm } from "@/components/SampleForm";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function NewSample() {
  const createCheckoutMutation = useCreateCheckout();
  const { toast } = useToast();

  const handleSubmit = async (data: any) => {
    try {
      await createCheckoutMutation.mutateAsync({
        customer_id: data.customer_id,
        inventory_item_id: data.inventory_item_id,
        checkout_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: data.due_date,
        status: 'checked_out',
        notes: data.notes || null,
        auth_notes: data.auth_notes || null,
      });
      toast({
        title: "Checkout Created",
        description: "The new sample checkout has been saved.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create checkout. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <SampleForm 
      title="New Sample Checkout" 
      onSubmit={handleSubmit} 
    />
  );
}
