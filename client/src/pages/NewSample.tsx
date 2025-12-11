import { useStore } from "@/lib/store";
import { SampleForm } from "@/components/SampleForm";
import { useToast } from "@/hooks/use-toast";

export function NewSample() {
  const addSample = useStore((state) => state.addSample);
  const { toast } = useToast();

  const handleSubmit = (data: any) => {
    addSample(data);
    toast({
      title: "Checkout Created",
      description: "The new sample checkout has been saved.",
    });
  };

  return (
    <SampleForm 
      title="New Sample Checkout" 
      onSubmit={handleSubmit} 
    />
  );
}
