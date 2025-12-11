import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: 'checked_out' | 'overdue' | 'returned';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    checked_out: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200",
    overdue: "bg-red-100 text-red-800 hover:bg-red-200 border-red-200",
    returned: "bg-green-100 text-green-800 hover:bg-green-200 border-green-200",
  };

  const labels = {
    checked_out: "Checked Out",
    overdue: "Overdue",
    returned: "Returned",
  };

  return (
    <Badge 
      variant="outline" 
      className={cn("uppercase text-[10px] tracking-wider font-semibold border px-2 py-0.5 shadow-sm", styles[status])}
    >
      {labels[status]}
    </Badge>
  );
}
