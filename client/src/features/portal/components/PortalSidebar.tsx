import { useLocation } from "wouter";
import { usePortalAuth } from "../hooks";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  MessageCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { label: "Home", icon: LayoutDashboard, path: "/portal" },
  { label: "Projects", icon: FolderKanban, path: "/portal", hash: "projects" },
  { label: "Contracts", icon: FileText, path: "/portal", hash: "contracts" },
];

export function PortalSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = usePortalAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    setLocation("/portal/login");
  };

  const isActive = (path: string) => {
    if (path === "/portal") return location === "/portal";
    return location.startsWith(path);
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen flex flex-col z-40 transition-all duration-300 ease-in-out",
        "bg-[hsl(215,30%,18%)] text-white",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold tracking-tight text-white/90">AT</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate leading-tight">Artisan Tile</p>
            <p className="text-[11px] text-white/50 truncate leading-tight">Client Portal</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.label}
              onClick={() => setLocation(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/8"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User section */}
      <div className="shrink-0 border-t border-white/10 p-3 space-y-2">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-white/70" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-medium truncate">{user?.customer?.name}</p>
              <p className="text-[11px] text-white/40 truncate">{user?.email}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/8 transition-colors",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[hsl(215,30%,18%)] border border-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors shadow-md"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
