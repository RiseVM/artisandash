import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  PlusCircle,
  LayoutDashboard,
  Users,
  Package,
  LogOut,
  Calendar,
  ChevronDown,
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
  Wrench,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

export function Header() {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { hasPermission, isAdmin, logout } = useAuth();

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
    ...(!isAdmin && hasPermission("view_team_resources") ? [{ href: "/timesheets", label: "Timesheets", icon: Clock }] : []),
    ...(!isAdmin ? [{ href: "/timecards", label: "Timecards", icon: Timer }] : []),
    ...(hasPermission("view_messages") ? [{ href: "/messages", label: "Messages", icon: MessageSquare }] : []),
  ];

  const adminItems: NavItem[] = [
    ...(isAdmin ? [{ href: "/time-management", label: "Time Management", icon: Clock }] : []),
    ...(isAdmin ? [{ href: "/admin/users", label: "User Management", icon: Shield }] : []),
    ...(isAdmin ? [{ href: "/admin/activity", label: "Activity Reports", icon: Activity }] : []),
    ...(hasPermission("view_bug_reports") ? [{ href: "/admin/bug-reports", label: "Bug Reports", icon: Bug }] : []),
    ...(isAdmin ? [{ href: "/admin/service-catalog", label: "Service Catalog", icon: Wrench }] : []),
  ];

  const visibleAdminItems = adminItems;
  const allNavItems = [...navItems, ...visibleAdminItems];

  const currentItem = allNavItems.find((item) => item.href === location) || navItems[0];
  const CurrentIcon = currentItem.icon;

  return (
    <div className="md:hidden bg-sidebar border-b border-sidebar-border">
      <div className="flex items-center justify-between p-3">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center"
          data-testid="button-mobile-logo"
        >
          <img
            src="/logo.jpg"
            alt="Artisan Tile"
            className="h-10 w-auto rounded-sm mix-blend-multiply"
          />
        </button>

        <div className="relative">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-sidebar-accent text-sidebar-accent-foreground text-sm font-medium"
            data-testid="button-mobile-menu"
          >
            <CurrentIcon className="h-4 w-4" />
            {currentItem.label}
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", mobileMenuOpen && "rotate-180")}
            />
          </button>

          {mobileMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-sidebar border border-sidebar-border rounded-md shadow-lg z-50">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors cursor-pointer",
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
              {visibleAdminItems.length > 0 && (
                <>
                  <div className="border-t border-sidebar-border my-1" />
                  <div className="px-4 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase">
                    Admin
                  </div>
                  {visibleAdminItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location === item.href;
                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors cursor-pointer",
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
                </>
              )}
              <div className="border-t border-sidebar-border">
                <button
                  onClick={logout}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full"
                  data-testid="button-mobile-logout"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
