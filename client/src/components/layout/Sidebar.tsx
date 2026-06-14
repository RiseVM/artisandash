import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  PlusCircle,
  LayoutDashboard,
  Users,
  Package,
  LogOut,
  Calendar,
  FileText,
  FileCheck,
  ClipboardList,
  Shield,
  Activity,
  FolderKanban,
  Bug,
  Calculator,
  MessageSquare,
  Wrench,
  Settings,
  Users2,
  Timer,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks";

function getCurrentMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user, hasPermission, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  // Fetch employee notes count for sidebar badge (anyone with manage_timecards)
  const canManageTimecards = hasPermission("manage_timecards");
  const { data: notesData } = useQuery<{ count: number }>({
    queryKey: ["/api/timecards/admin/notes-count", { weekStartDate: getCurrentMonday() }],
    queryFn: async () => {
      const res = await fetch(`/api/timecards/admin/notes-count?weekStartDate=${getCurrentMonday()}`, { credentials: "include" });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    enabled: canManageTimecards,
    refetchInterval: 60000,
  });
  const notesCount = notesData?.count || 0;

  // Clock status for greeting
  const { data: clockData } = useQuery<{ clockedIn: boolean }>({
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

  // Unread messages count (unified: internal + project client messages)
  const { data: unreadMsgData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unified-unread"],
    queryFn: async () => {
      const res = await fetch("/api/messages/unified-unread", { credentials: "include" });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    refetchInterval: 30000,
  });
  const unreadCount = unreadMsgData?.count || 0;

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/messages", label: "Messages", icon: MessageSquare },
    { href: "/new", label: "New Checkout", icon: PlusCircle },
    { href: "/checkouts", label: "Checkouts", icon: FileText },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/quote-builder", label: "Quote Builder", icon: Wrench },
    { href: "/estimates", label: "Quotes", icon: Calculator },
    { href: "/contracts", label: "Contracts", icon: ClipboardList },
    { href: "/calendar", label: "Calendar", icon: Calendar },
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/inventory", label: "Inventory", icon: Package },
    { href: "/team", label: "Team Resources", icon: Users2 },
    // Timecards page is for non-admin employees (shared kiosk login)
    ...(!isAdmin ? [{ href: "/timecards", label: "Timecards", icon: Timer }] : []),
    { href: "/agreements", label: "Signed Docs", icon: FileCheck },
  ];

  const adminItems = [
    { href: "/time-management", label: "Time Management", icon: Timer, permission: "manage_timecards" },
    { href: "/admin/onboarding", label: "New Member Setup", icon: UserPlus, permission: "manage_users" },
    { href: "/admin/users", label: "User Management", icon: Shield, permission: "manage_users" },
    { href: "/admin/activity", label: "Activity Reports", icon: Activity, permission: "view_reports" },
    { href: "/admin/bug-reports", label: "Bug Reports", icon: Bug, permission: "manage_users" },
    { href: "/settings/catalog", label: "Service Catalog", icon: Settings, permission: "manage_users" },
  ];

  const visibleAdminItems = adminItems.filter((item) => hasPermission(item.permission));

  const renderNavItem = (item: { href: string; label: string; icon: typeof LayoutDashboard }, badge: number) => {
    const Icon = item.icon;
    const isActive = location === item.href;
    return (
      <Link key={item.href} href={item.href}>
        <div
          className={cn(
            "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors cursor-pointer hover-elevate",
            isActive
              ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
              : "font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground",
          )}
        >
          {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-brass" />}
          <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-brass" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80")} />
          <span className="flex-1">{item.label}</span>
          {badge > 0 && (
            <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brass px-1 text-[10px] font-bold text-brass-foreground">
              {badge}
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <aside className="hidden md:flex w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0 flex-col">
      <div className="p-5 flex-1 overflow-y-auto">
        <div className="mb-7 px-1">
          <button
            onClick={() => setLocation("/")}
            className="w-full cursor-pointer"
            data-testid="button-desktop-logo"
          >
            <img
              src="/logo.jpg"
              alt="Artisan Tile"
              className="w-full h-auto rounded-sm mix-blend-multiply scale-[1.5] origin-center"
            />
          </button>
        </div>

        {user && (
          <div className="mb-6 rounded-lg border border-sidebar-border bg-card/50 px-3 py-2.5">
            <p className="text-sm font-semibold text-sidebar-foreground">
              {user.firstName || user.email.split("@")[0]}
            </p>
            <button
              onClick={() => setLocation(isAdmin ? "/time-management" : "/timecards")}
              className="mt-1 flex items-center gap-1.5 cursor-pointer transition-opacity hover:opacity-80"
              title="View timecards"
            >
              <div className={cn(
                "h-2 w-2 rounded-full",
                isClockedIn ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40",
              )} />
              <span className="text-xs text-sidebar-foreground/60">
                {isClockedIn ? "On the clock" : "Clocked out"}
              </span>
            </button>
          </div>
        )}

        <nav className="space-y-0.5">
          {navItems.map((item) =>
            renderNavItem(item, item.href === "/messages" && unreadCount > 0 ? unreadCount : 0),
          )}
        </nav>

        {visibleAdminItems.length > 0 && (
          <div className="mt-6 pt-5 border-t border-sidebar-border">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-brass/80">
              Administration
            </p>
            <nav className="space-y-0.5">
              {visibleAdminItems.map((item) =>
                renderNavItem(item, item.href === "/time-management" && notesCount > 0 ? notesCount : 0),
              )}
            </nav>
          </div>
        )}
      </div>

      <div className="p-5 border-t border-sidebar-border space-y-3">
        {user && (
          <div className="text-xs text-sidebar-foreground/60">
            <p className="truncate font-medium text-sidebar-foreground/80">{user.email}</p>
            <p className="capitalize">{user.role}</p>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground cursor-pointer"
          onClick={logout}
          data-testid="button-logout"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log Out
        </Button>
        <p className="text-[11px] leading-relaxed text-sidebar-foreground/45">
          &copy; 2025 Artisan Tile Kitchen &amp; Bath
          <br />
          Internal Use Only
        </p>
      </div>
    </aside>
  );
}
