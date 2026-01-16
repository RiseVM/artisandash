import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { PlusCircle, LayoutDashboard, Users, Package, LogOut, Calendar, ChevronDown, FileText, ClipboardList, Shield, Activity, FolderKanban, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/GlobalSearch";
import { BugReportButton } from "@/components/BugReportButton";
import { useAuth } from "@/hooks/useAuth";
import logoUrl from "@assets/1_1765497247808.jpg";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAdmin, hasPermission, logout } = useAuth();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/new", label: "New Checkout", icon: PlusCircle },
    { href: "/agreements", label: "Checkouts", icon: FileText },
    { href: "/contracts", label: "Contracts", icon: ClipboardList },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/calendar", label: "Calendar", icon: Calendar },
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/inventory", label: "Inventory", icon: Package },
  ];

  const adminItems = [
    { href: "/admin/users", label: "User Management", icon: Shield, permission: "manage_users" },
    { href: "/admin/activity", label: "Activity Reports", icon: Activity, permission: "view_reports" },
    { href: "/admin/bug-reports", label: "Bug Reports", icon: Bug, permission: "manage_users" },
  ];

  const visibleAdminItems = adminItems.filter(item => hasPermission(item.permission));
  const allNavItems = [...navItems, ...visibleAdminItems];

  const currentItem = allNavItems.find(item => item.href === location) || navItems[0];
  const CurrentIcon = currentItem.icon;

  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center justify-between p-3">
          <button 
            onClick={() => setLocation("/")}
            className="flex items-center"
            data-testid="button-mobile-logo"
          >
            <img 
              src={logoUrl} 
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
              <ChevronDown className={cn("h-4 w-4 transition-transform", mobileMenuOpen && "rotate-180")} />
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
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
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
                    <div className="px-4 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase">Admin</div>
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
                                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
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

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0 flex-col">
        <div className="p-6 flex-1">
          <div className="mb-8">
            <button 
              onClick={() => setLocation("/")}
              className="w-full cursor-pointer"
              data-testid="button-desktop-logo"
            >
              <img 
                src={logoUrl} 
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
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
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
            <>
              <div className="mt-6 pt-4 border-t border-sidebar-border">
                <p className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase mb-2">Admin</p>
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
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
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
            </>
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
            © 2025 Artisan Tile Kitchen & Bath
            <br />
            Internal Use Only
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50/50">
        <div className="container max-w-6xl mx-auto p-4 md:p-10">
          <div className="mb-6 flex items-center justify-end gap-3">
            {hasPermission("create_checkouts") && (
              <Button 
                onClick={() => setLocation("/new")}
                className="hidden md:flex"
                data-testid="button-new-checkout-global"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                New Checkout
              </Button>
            )}
            <GlobalSearch />
          </div>
          {children}
          
          {/* Mobile Floating Action Button */}
          {hasPermission("create_checkouts") && (
            <button
              onClick={() => setLocation("/new")}
              className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center z-50 hover:bg-primary/90 transition-colors"
              data-testid="fab-new-checkout"
            >
              <PlusCircle className="h-6 w-6" />
            </button>
          )}

          {/* Bug Report Button - visible on all pages */}
          <BugReportButton variant="floating" />
        </div>
      </main>
    </div>
  );
}
