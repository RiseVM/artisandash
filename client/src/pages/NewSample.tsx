import { useCreateCheckout } from "@/hooks/use-api";
import { SampleForm } from "@/components/SampleForm";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function NewSample() {
  const createCheckoutMutation = useCreateCheckout();
  const { toast } = useToast();

  const handleSubmit = async (data: any) => {
    try {
      const itemIds: number[] = data.inventory_item_ids || [];
      
      for (const itemId of itemIds) {
        await createCheckoutMutation.mutateAsync({
          customer_id: data.customer_id,
          inventory_item_id: itemId,
          checkout_date: format(new Date(), 'yyyy-MM-dd'),
          due_date: data.due_date,
          status: 'checked_out',
          notes: data.notes || null,
          auth_notes: data.auth_notes || null,
        });
      }
      
      toast({
        title: "Checkout Created",
        description: `${itemIds.length} sample${itemIds.length > 1 ? 's' : ''} checked out successfully.`,
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
