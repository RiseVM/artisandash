import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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

// Phase 3: Checkouts, Dashboard, Calendar
import { Dashboard } from "@/features/checkouts/Dashboard";
import { Calendar } from "@/features/checkouts/Calendar";
import { NewCheckout } from "@/features/checkouts/NewCheckout";
import { EditCheckout } from "@/features/checkouts/EditCheckout";

// Phase 4: Projects
import { Projects } from "@/features/projects/Projects";
import { ProjectDetail } from "@/features/projects/ProjectDetail";

// Phase 5: Portal
import { PortalAuthProvider } from "@/features/portal/PortalAuthProvider";
import { PortalLogin } from "@/features/portal/PortalLogin";
import { PortalDashboard } from "@/features/portal/PortalDashboard";
import { PortalProject } from "@/features/portal/PortalProject";

// Phase 6: Agreements
import { Agreements } from "@/features/agreements/Agreements";

// Phase 7: Contracts
import { Contracts } from "@/features/contracts/Contracts";
import { CabinetryContractForm } from "@/features/contracts/CabinetryContractForm";
import { HomeImprovementContractForm } from "@/features/contracts/HomeImprovementContractForm";
import { KitchenDesignRetainerForm } from "@/features/contracts/KitchenDesignRetainerForm";
import { RemoteSign } from "@/features/RemoteSign";

// Phase 8: Timesheets
import { MyTimesheets } from "@/features/timesheets/MyTimesheets";
import { AdminTimesheets } from "@/features/timesheets/AdminTimesheets";

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
    <PortalAuthProvider>
      <Switch>
        <Route path="/portal/login">
          <PortalLogin />
        </Route>
        <Route path="/portal/project/:id">
          <PortalProject />
        </Route>
        <Route path="/portal">
          <PortalDashboard />
        </Route>
      </Switch>
    </PortalAuthProvider>
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
          <Dashboard />
        </Route>

        {/* Checkouts */}
        <Route path="/checkouts">
          <Dashboard />
        </Route>
        <Route path="/new">
          <NewCheckout />
        </Route>
        <Route path="/edit/:id">
          <EditCheckout />
        </Route>
        <Route path="/calendar">
          <Calendar />
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
          <Agreements />
        </Route>
        <Route path="/contracts">
          <Contracts />
        </Route>
        <Route path="/contracts/cabinetry">
          <CabinetryContractForm />
        </Route>
        <Route path="/contracts/home-improvement">
          <HomeImprovementContractForm />
        </Route>
        <Route path="/contracts/kitchen-design-retainer">
          <KitchenDesignRetainerForm />
        </Route>

        {/* Projects */}
        <Route path="/projects">
          <Projects />
        </Route>
        <Route path="/projects/:id">
          <ProjectDetail />
        </Route>

        {/* Timesheets (NEW) */}
        <Route path="/timesheets">
          <MyTimesheets />
        </Route>
        <Route path="/admin/timesheets">
          <AdminTimesheets />
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
// Remote Signing Router (PUBLIC)
// ============================================
function RemoteSigningRouter() {
  return (
    <Switch>
      <Route path="/sign/:token">
        <RemoteSign />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

// ============================================
// Root Router
// ============================================
function Router() {
  const [location] = useLocation();

  if (location.startsWith("/sign/")) {
    return <RemoteSigningRouter />;
  }

  if (location.startsWith("/portal")) {
    return <PortalRouter />;
  }

  return <AdminRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <Toaster />
          <Router />
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
