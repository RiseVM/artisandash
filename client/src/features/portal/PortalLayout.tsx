import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import { usePortalAuth } from "./hooks";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, Loader2, ArrowLeft, Eye } from "lucide-react";

interface PortalLayoutProps {
  children: ReactNode;
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, isLoading, isAuthenticated, logout } = usePortalAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setLocation("/portal/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/portal/login");
    return null;
  }

  const isAdminPreview = (user as any)?.isAdminPreview === true;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin Preview Banner */}
      {isAdminPreview && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <Eye className="h-4 w-4" />
          Admin Preview — You are viewing this as the client sees it
          <Button
            variant="secondary"
            size="sm"
            className="ml-4 h-7 text-xs"
            onClick={() => window.close()}
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Close Preview
          </Button>
        </div>
      )}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <button
              onClick={() => setLocation("/portal")}
              className="hover:opacity-80 transition-opacity"
            >
              <img src="/logo.jpg" alt="Artisan Tile Kitchen & Bath" className="h-10" />
            </button>

            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="text-sm text-right">
                <p className="font-medium">{user?.customer?.name}</p>
                <p className="text-muted-foreground text-xs">{user?.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>

            {/* Mobile hamburger */}
            <button
              className="sm:hidden p-2 rounded-md hover:bg-slate-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile menu dropdown */}
          {mobileMenuOpen && (
            <div className="sm:hidden border-t mt-3 pt-3 pb-1 space-y-3">
              <div className="text-sm">
                <p className="font-medium">{user?.customer?.name}</p>
                <p className="text-muted-foreground text-xs">{user?.email}</p>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
