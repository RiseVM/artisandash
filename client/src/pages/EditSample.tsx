import { useRoute } from "wouter";
import { useStore } from "@/lib/store";
import { SampleForm } from "@/components/SampleForm";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export function EditSample() {
  const [, params] = useRoute("/edit/:id");
  const id = params ? parseInt(params.id) : 0;
  
  const checkout = useStore((state) => state.checkouts.find((c) => c.id === id));
  const updateCheckout = useStore((state) => state.updateCheckout);
  const { toast } = useToast();

  if (!checkout) {
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

  const handleSubmit = (data: any) => {
    updateCheckout(id, data);
    toast({
      title: "Sample Updated",
      description: "The sample details have been updated.",
    });
  };

  return (
    <SampleForm 
      title="Edit Sample" 
      initialData={checkout}
      onSubmit={handleSubmit} 
    />
  );
}
