import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { PlusCircle, LayoutDashboard } from "lucide-react";
import logoUrl from "@assets/1_1765497247808.jpg";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/new", label: "New Checkout", icon: PlusCircle },
  ];

  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col md:flex-row">
      {/* Sidebar / Topbar */}
      <aside className="w-full md:w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0">
        <div className="p-6">
          <div className="mb-8 px-2">
            <img 
              src={logoUrl} 
              alt="Artisan Tile" 
              className="w-full h-auto rounded-sm mix-blend-multiply" 
            />
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
        </div>
        
        <div className="mt-auto p-6 border-t border-sidebar-border hidden md:block">
          <p className="text-xs text-sidebar-foreground/50">
            © 2025 Artisan Tile Kitchen & Bath
            <br />
            Internal Use Only
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50/50">
        <div className="container max-w-5xl mx-auto p-6 md:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
