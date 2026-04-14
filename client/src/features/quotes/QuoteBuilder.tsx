import { Wrench } from "lucide-react";

export function QuoteBuilder() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Wrench className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Quote Builder</h1>
      </div>
      <p className="text-muted-foreground">Quote builder coming soon.</p>
    </div>
  );
}
