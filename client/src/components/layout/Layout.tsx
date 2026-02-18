import React from "react";
import { useLocation } from "wouter";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [, setLocation] = useLocation();
  const { hasPermission } = useAuth();

  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col md:flex-row">
      {/* Mobile Header */}
      <Header />

      {/* Desktop Sidebar */}
      <Sidebar />

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
        </div>
      </main>
    </div>
  );
}
