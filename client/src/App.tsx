import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

// Auth
import { useAuth } from "@/features/auth/hooks";
import { Landing } from "@/features/auth/Landing";

// Layout
import { Layout } from "@/components/layout/Layout";

// Admin
import { UserManagement } from "@/features/admin/UserManagement";
import { ActivityReports } from "@/features/admin/ActivityReports";
import { BugReports } from "@/features/admin/BugReports";

// Phase 2: Customers & Inventory
import { Customers } from "@/features/customers/Customers";
import { Inventory } from "@/features/inventory/Inventory";

// Placeholder component shown until feature modules are built
function Placeholder({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-primary mb-2">{name}</h1>
        <p className="text-muted-foreground">Module pending — Phase 0 skeleton running.</p>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-2">404</h1>
        <p className="text-muted-foreground">Page not found</p>
      </div>
    </div>
  );
}

// ============================================
// Portal Router (client-facing, separate auth)
// ============================================
function PortalRouter() {
  return (
    <Switch>
      <Route path="/portal/login">
        <Placeholder name="Portal Login" />
      </Route>
      <Route path="/portal/project/:id">
        <Placeholder name="Portal Project" />
      </Route>
      <Route path="/portal">
        <Placeholder name="Portal Dashboard" />
      </Route>
    </Switch>
  );
}

// ============================================
// Admin Router (staff-facing)
// ============================================
function AdminRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return (
    <Layout>
      <Switch>
        {/* Dashboard */}
        <Route path="/">
          <Placeholder name="Dashboard" />
        </Route>

        {/* Checkouts */}
        <Route path="/new">
          <Placeholder name="New Checkout" />
        </Route>
        <Route path="/edit/:id">
          <Placeholder name="Edit Checkout" />
        </Route>
        <Route path="/calendar">
          <Placeholder name="Calendar" />
        </Route>

        {/* Inventory & Customers */}
        <Route path="/inventory">
          <Inventory />
        </Route>
        <Route path="/customers">
          <Customers />
        </Route>

        {/* Contracts & Agreements */}
        <Route path="/agreements">
          <Placeholder name="Agreements" />
        </Route>
        <Route path="/contracts">
          <Placeholder name="Contracts" />
        </Route>
        <Route path="/contracts/cabinetry">
          <Placeholder name="Cabinetry Contract" />
        </Route>
        <Route path="/contracts/home-improvement">
          <Placeholder name="Home Improvement Contract" />
        </Route>

        {/* Projects */}
        <Route path="/projects">
          <Placeholder name="Projects" />
        </Route>
        <Route path="/projects/:id">
          <Placeholder name="Project Detail" />
        </Route>

        {/* Timesheets (NEW) */}
        <Route path="/timesheets">
          <Placeholder name="My Timesheets" />
        </Route>
        <Route path="/admin/timesheets">
          <Placeholder name="All Timesheets (Admin)" />
        </Route>

        {/* Admin */}
        <Route path="/admin/users">
          <UserManagement />
        </Route>
        <Route path="/admin/activity">
          <ActivityReports />
        </Route>
        <Route path="/admin/bug-reports">
          <BugReports />
        </Route>

        <Route>
          <NotFound />
        </Route>
      </Switch>
    </Layout>
  );
}

// ============================================
// Root Router
// ============================================
function Router() {
  const [location] = useLocation();

  if (location.startsWith("/portal")) {
    return <PortalRouter />;
  }

  return <AdminRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
