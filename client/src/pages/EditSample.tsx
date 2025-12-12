import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useUpdateCheckout } from "@/hooks/use-api";
import { SampleForm } from "@/components/SampleForm";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { CheckoutView } from "@shared/schema";

export function EditSample() {
  const [, params] = useRoute("/edit/:id");
  const [, setLocation] = useLocation();
  const id = params ? parseInt(params.id) : 0;
  const updateCheckoutMutation = useUpdateCheckout();
  const { toast } = useToast();

  const { data: checkout, isLoading, error } = useQuery<CheckoutView>({
    queryKey: [`/api/checkouts/${id}`],
    enabled: id > 0,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !checkout) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold mb-2">Sample Not Found</h2>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (data: any) => {
    try {
      await updateCheckoutMutation.mutateAsync({
        id,
        data: {
          customer_id: data.customer_id,
          inventory_item_id: data.inventory_item_id,
          due_date: data.due_date,
          notes: data.notes || null,
          auth_notes: data.auth_notes || null,
        }
      });
      toast({
        title: "Sample Updated",
        description: "The sample details have been updated.",
      });
      setLocation("/");
    } catch (err) {
      toast({
        title: "Update Failed",
        description: "Failed to update the sample. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <SampleForm 
      title="Edit Sample" 
      initialData={checkout}
      onSubmit={handleSubmit} 
    />
  );
}
