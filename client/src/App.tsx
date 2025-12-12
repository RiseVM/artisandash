import { Switch, Route } from "wouter";
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
import { Landing } from "@/pages/Landing";
import { LoginFailed } from "@/pages/LoginFailed";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login-failed" component={LoginFailed} />
      {!isAuthenticated ? (
        <Route component={Landing} />
      ) : (
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/new" component={NewSample} />
            <Route path="/edit/:id" component={EditSample} />
            <Route path="/inventory" component={Inventory} />
            <Route path="/customers" component={Customers} />
            <Route path="/calendar" component={Calendar} />
            <Route path="/agreements" component={Agreements} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      )}
    </Switch>
  );
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
