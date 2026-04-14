import { MessageSquare } from "lucide-react";

export function Messages() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <MessageSquare className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Messages</h1>
      </div>
      <p className="text-muted-foreground">Messaging coming soon.</p>
    </div>
  );
}
