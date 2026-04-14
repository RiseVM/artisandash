import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "checked_out" | "overdue" | "returned";
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = {
    checked_out: {
      label: "Checked Out",
      dot: "bg-amber-500",
      bg: "bg-amber-50",
      text: "text-amber-700",
      ring: "ring-amber-500/20",
    },
    overdue: {
      label: "Overdue",
      dot: "bg-red-500",
      bg: "bg-red-50",
      text: "text-red-700",
      ring: "ring-red-500/20",
    },
    returned: {
      label: "Returned",
      dot: "bg-emerald-500",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      ring: "ring-emerald-500/20",
    },
  };

  const c = config[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset",
        c.bg, c.text, c.ring,
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
      )}
    >
      <span className={cn("rounded-full shrink-0", c.dot, size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2")} />
      {c.label}
    </span>
  );
}
