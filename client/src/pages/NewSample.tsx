import { useCreateCheckout, useCreateSignedAgreement, useCustomers, useInventory } from "@/hooks/use-api";
import { SampleForm } from "@/components/SampleForm";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function NewSample() {
  const createCheckoutMutation = useCreateCheckout();
  const createAgreementMutation = useCreateSignedAgreement();
  const { data: customers = [] } = useCustomers();
  const { data: inventory = [] } = useInventory();
  const { toast } = useToast();

  const handleSubmit = async (data: any) => {
    try {
      const itemIds: number[] = data.inventory_item_ids || [];
      const checkoutIds: number[] = [];
      
      // If no samples selected, just show success for customer info collection
      if (itemIds.length === 0) {
        toast({
          title: "Customer Info Saved",
          description: "Customer information has been recorded successfully.",
        });
        return;
      }
      
      for (const itemId of itemIds) {
        const checkout = await createCheckoutMutation.mutateAsync({
          customer_id: data.customer_id,
          inventory_item_id: itemId,
          checkout_date: format(new Date(), 'yyyy-MM-dd'),
          due_date: data.due_date,
          project_type: data.project_type || null,
          needs_installer: data.needs_installer || "no",
          wants_designer: data.wants_designer || "no",
          start_date: data.start_date || null,
          special_request: data.special_request || null,
          status: 'checked_out',
          notes: data.notes || null,
          auth_notes: data.auth_notes || null,
        });
        checkoutIds.push(checkout.id);
      }
      
      if (data.signature && data.customer_id) {
        const customer = customers.find(c => c.id === data.customer_id);
        const customerName = customer?.name || "Customer";
        
        for (let i = 0; i < checkoutIds.length; i++) {
          const itemId = itemIds[i];
          const item = inventory.find(it => it.id === itemId);
          const itemName = item?.name || `Item #${itemId}`;
          const documentTitle = `${customerName} - ${format(new Date(), 'yyyy-MM-dd')} - ${itemName}`;
          
          await createAgreementMutation.mutateAsync({
            customer_id: data.customer_id,
            checkout_id: checkoutIds[i],
            document_title: documentTitle,
            signature_data: data.signature,
          });
        }
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
