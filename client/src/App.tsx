import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/Sidebar";
import Landing from "@/pages/landing";
import DashboardCategory from "@/pages/dashboard-category";
import DashboardView from "@/pages/dashboard-view";
import Queries from "@/pages/queries";
import MyQueries from "@/pages/my-queries";
import QueryReport from "@/pages/query-report";
import Sources from "@/pages/sources";
import AIAssistant from "@/pages/ai-assistant";
import { ShieldAlert } from "lucide-react";
import CutListOptimizer from "@/pages/cut-list-optimizer";
import CuttingListReport from "@/pages/cutting-list-report";
import JobListReport from "@/pages/job-list-report";
import FramerDashboard from "@/pages/framer-dashboard";
import NotFound from "@/pages/not-found";

function RestrictedAccess() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-display font-bold mb-2">Access restricted</h1>
      <p className="text-muted-foreground max-w-md">
        This area is available to administrators only. Use the Reports section to run
        the reports prepared for your portal.
      </p>
    </div>
  );
}

function AuthenticatedApp() {
  const { isAdmin } = useAuth();
  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={() => <DashboardCategory />} />
          <Route path="/dashboards/admin" component={() => <DashboardCategory />} />
          <Route path="/dashboards/framer" component={() => <DashboardCategory />} />
          <Route path="/dashboards/items" component={() => <DashboardCategory />} />
          <Route path="/dashboard/:id" component={DashboardView} />
          <Route path="/reports" component={MyQueries} />
          <Route path="/queries" component={isAdmin ? Queries : MyQueries} />
          <Route path="/query/:id" component={QueryReport} />
          <Route path="/sources" component={isAdmin ? Sources : RestrictedAccess} />
          <Route path="/ai-assistant" component={isAdmin ? AIAssistant : RestrictedAccess} />
          <Route path="/cut-list-optimizer" component={CutListOptimizer} />
          <Route path="/reports/cutting-list" component={CuttingListReport} />
          <Route path="/reports/job-list" component={JobListReport} />
          <Route path="/framer-dashboard" component={FramerDashboard} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return <AuthenticatedApp />;
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
