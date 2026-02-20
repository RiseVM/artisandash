import { useCreateCheckout, useSendFollowUpEmails } from "./hooks";
import { useCustomers } from "@/features/customers/hooks";
import { useInventory } from "@/features/inventory/hooks";
import { SampleForm } from "./SampleForm";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { api } from "@/lib/api";
import type { SignedAgreement } from "@shared/schema";

export function NewCheckout() {
  const createCheckoutMutation = useCreateCheckout();
  const sendFollowUpMutation = useSendFollowUpEmails();
  const { data: customers = [] } = useCustomers();
  const { data: inventory = [] } = useInventory();
  const { toast } = useToast();

  const handleSubmit = async (data: any) => {
    try {
      const itemIds: number[] = data.inventory_item_ids || [];
      const checkoutIds: number[] = [];

      // If no samples selected, send follow-up emails and show success
      if (itemIds.length === 0) {
        if (
          data.needs_installer === "yes" ||
          data.wants_designer === "yes" ||
          data.has_special_request === "yes"
        ) {
          await sendFollowUpMutation.mutateAsync({
            customer_id: data.customer_id,
            needs_installer: data.needs_installer || "no",
            wants_designer: data.wants_designer || "no",
            has_special_request: data.has_special_request || "no",
            special_request: data.special_request || undefined,
            project_type: data.project_type || undefined,
            start_date: data.start_date || undefined,
            notes: data.notes || undefined,
          });
        }
        toast({
          title: "Customer Info Saved",
          description:
            "Customer information has been recorded and notifications sent.",
        });
        return;
      }

      for (const itemId of itemIds) {
        const checkout = await createCheckoutMutation.mutateAsync({
          customer_id: data.customer_id,
          inventory_item_id: itemId,
          checkout_date: format(new Date(), "yyyy-MM-dd"),
          due_date: data.due_date,
          project_type: data.project_type || null,
          needs_installer: data.needs_installer || "no",
          wants_designer: data.wants_designer || "no",
          start_date: data.start_date || null,
          has_special_request: data.has_special_request || "no",
          special_request: data.special_request || null,
          status: "checked_out",
          notes: data.notes || null,
          auth_notes: data.auth_notes || null,
        });
        checkoutIds.push(checkout.id);
      }

      // Create signed agreements if signature was captured
      if (data.signature && data.customer_id) {
        const customer = customers.find((c) => c.id === data.customer_id);
        const customerName = customer?.name || "Customer";

        for (let i = 0; i < checkoutIds.length; i++) {
          const itemId = itemIds[i];
          const item = inventory.find((it) => it.id === itemId);
          const itemName = item?.name || `Item #${itemId}`;
          const documentTitle = `${customerName} - ${format(new Date(), "yyyy-MM-dd")} - ${itemName}`;

          await api.post<SignedAgreement>("/api/agreements", {
            customer_id: data.customer_id,
            checkout_id: checkoutIds[i],
            document_title: documentTitle,
            signature_data: data.signature,
          });
        }
      }

      toast({
        title: "Checkout Created",
        description: `${itemIds.length} sample${itemIds.length > 1 ? "s" : ""} checked out successfully.`,
      });
    } catch (err: any) {
      const errorMsg =
        err?.message || "Failed to create checkout. Please try again.";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  return <SampleForm title="New Sample Checkout" onSubmit={handleSubmit} />;
}
