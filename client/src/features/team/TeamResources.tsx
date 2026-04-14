import { Users } from "lucide-react";

export function TeamResources() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Users className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Team Resources</h1>
      </div>
      <p className="text-muted-foreground">Team resources coming soon.</p>
    </div>
  );
}
