import { ReactNode } from "react";
import { useLocation } from "wouter";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { Button } from "@/components/ui/button";
import { LogOut, FolderKanban, Loader2 } from "lucide-react";

interface PortalLayoutProps {
  children: ReactNode;
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, isLoading, isAuthenticated, logout } = usePortalAuth();

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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLocation("/portal")}
                className="flex items-center gap-2 text-lg font-semibold hover:text-primary transition-colors"
              >
                <FolderKanban className="h-6 w-6" />
                <span>Client Portal</span>
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-right">
                <p className="font-medium">{user?.customer.name}</p>
                <p className="text-muted-foreground">{user?.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
