import { Link, useLocation } from "wouter";
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
  Clock,
  Timer,
  MessageSquare,
  BookOpen,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user, hasPermission, isAdmin, logout } = useAuth();

  // Build permission-gated nav items
  const navItems: NavItem[] = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    ...(hasPermission("create_checkouts") ? [{ href: "/new", label: "New Checkout", icon: PlusCircle }] : []),
    ...(hasPermission("create_checkouts") ? [{ href: "/checkouts", label: "Checkouts", icon: FileText }] : []),
    ...(hasPermission("view_signed_docs") ? [{ href: "/agreements", label: "Signed Docs", icon: FileCheck }] : []),
    ...(hasPermission("manage_contracts") ? [{ href: "/contracts", label: "Contracts", icon: ClipboardList }] : []),
    ...(hasPermission("manage_projects") ? [{ href: "/projects", label: "Projects", icon: FolderKanban }] : []),
    ...(hasPermission("view_calendar") ? [{ href: "/calendar", label: "Calendar", icon: Calendar }] : []),
    ...(hasPermission("manage_customers") ? [{ href: "/customers", label: "Customers", icon: Users }] : []),
    ...(hasPermission("manage_inventory") ? [{ href: "/inventory", label: "Inventory", icon: Package }] : []),
    ...(hasPermission("view_team_resources") ? [{ href: "/timesheets", label: "Timesheets", icon: Clock }] : []),
    ...(!isAdmin ? [{ href: "/timecards", label: "Timecards", icon: Timer }] : []),
    ...(hasPermission("view_messages") ? [{ href: "/messages", label: "Messages", icon: MessageSquare }] : []),
  ];

  // Admin-only items
  const adminItems: NavItem[] = [
    ...(isAdmin ? [{ href: "/time-management", label: "Time Management", icon: Clock }] : []),
    ...(isAdmin ? [{ href: "/admin/users", label: "User Management", icon: Shield }] : []),
    ...(isAdmin ? [{ href: "/admin/activity", label: "Activity Reports", icon: Activity }] : []),
    ...(hasPermission("view_bug_reports") ? [{ href: "/admin/bug-reports", label: "Bug Reports", icon: Bug }] : []),
    ...(isAdmin ? [{ href: "/admin/service-catalog", label: "Service Catalog", icon: Wrench }] : []),
  ];

  const visibleAdminItems = adminItems;

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

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
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
