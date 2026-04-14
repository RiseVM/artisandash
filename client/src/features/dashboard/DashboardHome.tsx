import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/features/auth/hooks";
import { useCheckouts } from "@/features/checkouts/hooks";
import { useContracts } from "@/features/contracts/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  AlertTriangle,
  FileCheck,
  FolderKanban,
  Calculator,
  MessageSquare,
  Users,
  PlusCircle,
  Clock,
  ArrowRight,
  Timer,
} from "lucide-react";
import { startOfMonth, format, formatDistanceToNow } from "date-fns";
import type { CheckoutView } from "@shared/schema";

function getCurrentMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export function DashboardHome() {
  const { user } = useAuth();
  const firstName = user?.firstName || user?.email?.split("@")[0] || "there";

  // Fetch checkouts
  const { data: checkouts = [] } = useCheckouts();
  const activeCheckouts = checkouts.filter((c: CheckoutView) => c.status === "checked_out");
  const overdueCheckouts = checkouts.filter((c: CheckoutView) => c.status === "overdue");

  // Fetch contracts
  const { data: contracts = [] } = useContracts();
  const monthStart = startOfMonth(new Date());
  const contractsThisMonth = contracts.filter(
    (c: any) => new Date(c.createdAt) >= monthStart
  );

  // Fetch projects
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
  const activeProjects = projects.filter((p: any) => p.status === "active" || p.status === "in_progress");

  // Fetch estimates
  const { data: estimates = [] } = useQuery<any[]>({
    queryKey: ["/api/estimates"],
    queryFn: async () => {
      const res = await fetch("/api/estimates", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
  const pendingEstimates = estimates.filter((e: any) => e.status === "draft" || e.status === "sent");

  // Unread messages (unified: internal + project client messages)
  const { data: unreadMsgData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unified-unread"],
    queryFn: async () => {
      const res = await fetch("/api/messages/unified-unread", { credentials: "include" });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
  });
  const unreadCount = unreadMsgData?.count || 0;

  // Clock status
  const { data: clockData } = useQuery<{ clockedIn: boolean; lastPunchIn?: string }>({
    queryKey: ["/api/timecards/clock/status"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/timecards/clock/status", { credentials: "include" });
        if (!res.ok) return { clockedIn: false };
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("json")) return { clockedIn: false };
        return res.json();
      } catch {
        return { clockedIn: false };
      }
    },
    refetchInterval: 30000,
  });
  const isClockedIn = clockData?.clockedIn ?? false;

  // Customers count
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Build recent activity from checkouts and contracts
  const recentActivity: { type: string; label: string; time: Date; href: string }[] = [];

  checkouts.slice(0, 15).forEach((c: CheckoutView) => {
    if (c.status === "returned" && c.returnedAt) {
      recentActivity.push({
        type: "return",
        label: `${c.customerName} returned ${c.itemName}`,
        time: new Date(c.returnedAt),
        href: "/checkouts",
      });
    } else if (c.createdAt) {
      recentActivity.push({
        type: "checkout",
        label: `${c.customerName} checked out ${c.itemName}`,
        time: new Date(c.createdAt),
        href: "/checkouts",
      });
    }
  });

  contracts.slice(0, 10).forEach((c: any) => {
    if (c.status === "signed" && c.signedAt) {
      recentActivity.push({
        type: "contract",
        label: `Contract signed: ${c.customerName || "Customer"} — ${c.contractType || "agreement"}`,
        time: new Date(c.signedAt),
        href: "/contracts",
      });
    }
  });

  recentActivity.sort((a, b) => b.time.getTime() - a.time.getTime());
  const topActivity = recentActivity.slice(0, 8);

  // Today's date
  const today = format(new Date(), "EEEE, MMMM d, yyyy");

  return (
    <div className="space-y-6">
      {/* Greeting & Date */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Good {getTimeOfDay()}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2.5 h-2.5 rounded-full ${isClockedIn ? "bg-green-500" : "bg-gray-400"}`} />
            <span className="text-muted-foreground">
              {isClockedIn ? "Clocked In" : "Clocked Out"}
            </span>
          </div>
          <Link href="/new">
            <Button size="sm">
              <PlusCircle className="h-4 w-4 mr-1" />
              New Checkout
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          href="/checkouts"
          icon={<Package className="h-5 w-5" />}
          label="Active Checkouts"
          value={activeCheckouts.length}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          href="/checkouts"
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Overdue"
          value={overdueCheckouts.length}
          color={overdueCheckouts.length > 0 ? "text-red-600" : "text-gray-500"}
          bgColor={overdueCheckouts.length > 0 ? "bg-red-50" : "bg-gray-50"}
        />
        <StatCard
          href="/projects"
          icon={<FolderKanban className="h-5 w-5" />}
          label="Active Projects"
          value={activeProjects.length}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
        <StatCard
          href="/estimates"
          icon={<Calculator className="h-5 w-5" />}
          label="Pending Quotes"
          value={pendingEstimates.length}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <StatCard
          href="/contracts"
          icon={<FileCheck className="h-5 w-5" />}
          label="Contracts (Month)"
          value={contractsThisMonth.length}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <StatCard
          href="/messages"
          icon={<MessageSquare className="h-5 w-5" />}
          label="Unread Messages"
          value={unreadCount}
          color={unreadCount > 0 ? "text-red-600" : "text-gray-500"}
          bgColor={unreadCount > 0 ? "bg-red-50" : "bg-gray-50"}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {topActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {topActivity.map((item, i) => (
                  <Link key={i} href={item.href}>
                    <div className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        item.type === "return" ? "bg-green-500" :
                        item.type === "checkout" ? "bg-blue-500" :
                        "bg-purple-500"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{item.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(item.time, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links & Overdue Items */}
        <div className="space-y-6">
          {/* Overdue Items */}
          {overdueCheckouts.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Overdue Items ({overdueCheckouts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overdueCheckouts.slice(0, 5).map((c: CheckoutView) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <div className="truncate flex-1">
                        <span className="font-medium">{c.customerName}</span>
                        <span className="text-muted-foreground"> — {c.itemName}</span>
                      </div>
                      {c.dueDate && (
                        <span className="text-xs text-red-600 ml-2 whitespace-nowrap">
                          Due {format(new Date(c.dueDate), "MMM d")}
                        </span>
                      )}
                    </div>
                  ))}
                  {overdueCheckouts.length > 5 && (
                    <Link href="/checkouts">
                      <p className="text-xs text-blue-600 hover:underline cursor-pointer mt-1">
                        View all {overdueCheckouts.length} overdue items
                      </p>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <QuickAction href="/new" icon={<PlusCircle className="h-4 w-4" />} label="New Checkout" />
                <QuickAction href="/quote-builder" icon={<Calculator className="h-4 w-4" />} label="Quote Builder" />
                <QuickAction href="/contracts" icon={<FileCheck className="h-4 w-4" />} label="New Contract" />
                <QuickAction href="/projects" icon={<FolderKanban className="h-4 w-4" />} label="Projects" />
                <QuickAction href="/customers" icon={<Users className="h-4 w-4" />} label="Customers" />
                <QuickAction href="/timecards" icon={<Timer className="h-4 w-4" />} label="Timecards" />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">At a Glance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Customers</span>
                  <span className="font-medium">{customers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Projects</span>
                  <span className="font-medium">{projects.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Estimates</span>
                  <span className="font-medium">{estimates.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Contracts</span>
                  <span className="font-medium">{contracts.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function StatCard({
  href,
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="p-4">
          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${bgColor} ${color} mb-2`}>
            {icon}
          </div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link href={href}>
      <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3 cursor-pointer">
        {icon}
        <span className="text-sm">{label}</span>
      </Button>
    </Link>
  );
}
