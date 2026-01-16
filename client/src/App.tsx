import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { NewSample } from "@/pages/NewSample";
import { EditSample } from "@/pages/EditSample";
import { Inventory } from "@/pages/Inventory";
import { Customers } from "@/pages/Customers";
import { Calendar } from "@/pages/Calendar";
import { Agreements } from "@/pages/Agreements";
import { Contracts } from "@/pages/Contracts";
import { CabinetryContractForm } from "@/pages/CabinetryContractForm";
import { HomeImprovementContractForm } from "@/pages/HomeImprovementContractForm";
import { UserManagement } from "@/pages/UserManagement";
import { ActivityReports } from "@/pages/ActivityReports";
import { BugReports } from "@/pages/BugReports";
import { Projects } from "@/pages/Projects";
import { ProjectDetail } from "@/pages/ProjectDetail";
import { Landing } from "@/pages/Landing";
import { LoginFailed } from "@/pages/LoginFailed";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { PortalAuthProvider } from "@/hooks/usePortalAuth";
import { PortalLogin } from "@/pages/portal/PortalLogin";
import { PortalDashboard } from "@/pages/portal/PortalDashboard";
import { PortalProject } from "@/pages/portal/PortalProject";

function PortalRouter() {
  return (
    <PortalAuthProvider>
      <Switch>
        <Route path="/portal/login" component={PortalLogin} />
        <Route path="/portal/project/:id" component={PortalProject} />
        <Route path="/portal" component={PortalDashboard} />
      </Switch>
    </PortalAuthProvider>
  );
}

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
        <Route path="/" component={Dashboard} />
        <Route path="/new" component={NewSample} />
        <Route path="/edit/:id" component={EditSample} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/customers" component={Customers} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/agreements" component={Agreements} />
        <Route path="/contracts" component={Contracts} />
        <Route path="/contracts/cabinetry" component={CabinetryContractForm} />
        <Route path="/contracts/home-improvement" component={HomeImprovementContractForm} />
        <Route path="/projects" component={Projects} />
        <Route path="/projects/:id" component={ProjectDetail} />
        <Route path="/admin/users" component={UserManagement} />
        <Route path="/admin/activity" component={ActivityReports} />
        <Route path="/admin/bug-reports" component={BugReports} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function Router() {
  const [location] = useLocation();

  // Portal routes have their own auth system
  if (location.startsWith("/portal")) {
    return <PortalRouter />;
  }

  // Handle login-failed separately
  if (location === "/login-failed") {
    return <LoginFailed />;
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
