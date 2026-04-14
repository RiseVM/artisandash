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

  // Fetch employee notes count for sidebar badge (admin only)
  const { data: notesData } = useQuery<{ count: number }>({
    queryKey: ["/api/timecards/admin/notes-count", { weekStartDate: getCurrentMonday() }],
    queryFn: async () => {
      const res = await fetch(`/api/timecards/admin/notes-count?weekStartDate=${getCurrentMonday()}`, { credentials: "include" });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    enabled: isAdmin,
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

  // Unread messages count
  const { data: unreadMsgData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-total"],
    queryFn: async () => {
      const res = await fetch("/api/messages/unread-total", { credentials: "include" });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    refetchInterval: 30000,
  });
  const unreadCount = unreadMsgData?.count || 0;

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/new", label: "New Checkout", icon: PlusCircle },
    { href: "/checkouts", label: "Checkouts", icon: FileText },
    { href: "/agreements", label: "Signed Docs", icon: FileCheck },
    { href: "/contracts", label: "Contracts", icon: ClipboardList },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/quote-builder", label: "Quote Builder", icon: Wrench },
    { href: "/estimates", label: "Quotes", icon: Calculator },
    { href: "/calendar", label: "Calendar", icon: Calendar },
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/inventory", label: "Inventory", icon: Package },
    { href: "/team", label: "Team Resources", icon: Users2 },
    { href: "/timecards", label: "Timecards", icon: Timer },
    { href: "/messages", label: "Messages", icon: MessageSquare },
  ];

  const adminItems = [
    { href: "/time-management", label: "Time Management", icon: Timer, permission: "manage_users" },
    { href: "/admin/users", label: "User Management", icon: Shield, permission: "manage_users" },
    { href: "/admin/activity", label: "Activity Reports", icon: Activity, permission: "view_reports" },
    { href: "/admin/bug-reports", label: "Bug Reports", icon: Bug, permission: "manage_users" },
    { href: "/settings/catalog", label: "Service Catalog", icon: Settings, permission: "manage_users" },
  ];

  const visibleAdminItems = adminItems.filter((item) => hasPermission(item.permission));

  return (
    <aside className="hidden md:flex w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0 flex-col">
      <div className="p-6 flex-1">
        <div className="mb-8">
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
          <div className="mb-5 px-3">
            <p className="text-sm font-semibold text-sidebar-foreground">
              Hi, {user.firstName || user.email.split("@")[0]}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isClockedIn ? "bg-green-500" : "bg-gray-400",
              )} />
              <span className="text-xs text-sidebar-foreground/60">
                {isClockedIn ? "Clocked In" : "Clocked Out"}
              </span>
            </div>
          </div>
        )}

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            const msgBadge = item.href === "/messages" && unreadCount > 0 ? unreadCount : 0;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {msgBadge > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                      {msgBadge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {visibleAdminItems.length > 0 && (
          <div className="mt-6 pt-4 border-t border-sidebar-border">
            <p className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase mb-2">
              Admin
            </p>
            <nav className="space-y-1">
              {visibleAdminItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                const badge = item.href === "/time-management" && notesCount > 0 ? notesCount : 0;
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                      {badge > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                          {badge}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-sidebar-border space-y-4">
        {user && (
          <div className="text-xs text-sidebar-foreground/70">
            <p className="font-medium">{user.email}</p>
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
        <p className="text-xs text-sidebar-foreground/50">
          &copy; 2025 Artisan Tile Kitchen &amp; Bath
          <br />
          Internal Use Only
        </p>
      </div>
    </aside>
  );
}
