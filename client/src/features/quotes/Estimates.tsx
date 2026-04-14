import { Calculator } from "lucide-react";

export function Estimates() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Calculator className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Quotes</h1>
      </div>
      <p className="text-muted-foreground">Quotes management coming soon.</p>
    </div>
  );
}
