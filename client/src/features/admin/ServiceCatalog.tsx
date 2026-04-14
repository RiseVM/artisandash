import { Settings } from "lucide-react";

export function ServiceCatalog() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Service Catalog</h1>
      </div>
      <p className="text-muted-foreground">Service catalog management coming soon.</p>
    </div>
  );
}
