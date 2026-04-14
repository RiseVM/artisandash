import { ReactNode } from "react";
import { useLocation } from "wouter";
import { usePortalAuth } from "./hooks";
import { Loader2 } from "lucide-react";
import { PortalSidebar } from "./components/PortalSidebar";

interface PortalLayoutProps {
  children: ReactNode;
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const [, setLocation] = useLocation();
  const { isLoading, isAuthenticated } = usePortalAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(210,20%,97%)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(215,30%,35%)]" />
          <p className="text-sm text-muted-foreground">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/portal/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)]">
      <PortalSidebar />

      {/* Main content — offset by sidebar width */}
      <main className="ml-[240px] transition-all duration-300 ease-in-out">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
