import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { api, buildUrl } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, LayoutDashboard, Trash2, FileText, Scissors, Briefcase } from "lucide-react";
import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import type { Dashboard } from "@shared/schema";

const categoryLabels: Record<string, string> = {
  admin: "Administration Reports",
  framer: "Framer Reports",
  items: "Item Reports",
};

const builtInReports: Record<string, Array<{ href: string; label: string; description: string; icon: typeof Scissors }>> = {
  items: [
    {
      href: "/reports/cutting-list",
      label: "Cutting List",
      description: "View cutting list items filtered by type, date range, and status",
      icon: Scissors,
    },
  ],
  framer: [
    {
      href: "/reports/job-list",
      label: "Jobs Listing",
      description: "View and filter jobs by status, completion, date range, and more",
      icon: Briefcase,
    },
  ],
};

export default function DashboardCategory() {
  const [location, navigate] = useLocation();
  const params = useParams<{ category: string }>();
  const categoryFromPath = location.split("/").pop() || "admin";
  const category = params.category || (["admin", "framer", "items"].includes(categoryFromPath) ? categoryFromPath : "admin");
  const categoryLabel = categoryLabels[category] || "Reports";

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: allDashboards = [], isLoading } = useQuery<Dashboard[]>({
    queryKey: [api.dashboards.list.path],
  });

  // Filter dashboards by category (stored in description as a prefix for simplicity)
  const dashboards = allDashboards.filter(d => 
    d.description?.startsWith(`[${category}]`) || 
    (category === "admin" && !d.description?.startsWith("["))
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(api.dashboards.create.method, api.dashboards.create.path, { 
        name, 
        description: `[${category}] ${description}` 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.dashboards.list.path] });
      setOpen(false);
      setName("");
      setDescription("");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(api.dashboards.delete.method, buildUrl(api.dashboards.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.dashboards.list.path] });
    }
  });

  const getDisplayDescription = (desc: string | null) => {
    if (!desc) return "No description";
    return desc.replace(/^\[[^\]]+\]\s*/, "");
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">{categoryLabel}</h1>
          <p className="text-muted-foreground mt-1">View and manage your {categoryLabel.toLowerCase()}</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-dashboard">
              <Plus className="h-4 w-4 mr-2" />
              New Report
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create {categoryLabel.replace("Reports", "Report")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Monthly Summary"
                  data-testid="input-dashboard-name"
                />
              </div>
              <div>
                <Label htmlFor="desc">Description</Label>
                <Textarea 
                  id="desc" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key metrics and KPIs"
                  data-testid="input-dashboard-description"
                />
              </div>
              <Button 
                onClick={() => createMutation.mutate()} 
                disabled={!name || createMutation.isPending}
                className="w-full"
                data-testid="button-submit-dashboard"
              >
                {createMutation.isPending ? "Creating..." : "Create Report"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {(builtInReports[category] || []).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {(builtInReports[category] || []).map((report) => {
            const Icon = report.icon;
            return (
              <Card
                key={report.href}
                className="hover-elevate cursor-pointer"
                onClick={() => navigate(report.href)}
                data-testid={`card-report-${report.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    {report.label}
                  </CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-3/4 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : dashboards.length === 0 && !(builtInReports[category] || []).length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first {categoryLabel.toLowerCase().replace("reports", "report")}
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Report
            </Button>
          </CardContent>
        </Card>
      ) : dashboards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboards.map((dashboard) => (
            <Card key={dashboard.id} className="group hover-elevate cursor-pointer" data-testid={`card-dashboard-${dashboard.id}`}>
              <Link href={`/dashboard/${dashboard.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LayoutDashboard className="h-5 w-5 text-primary" />
                    {dashboard.name}
                  </CardTitle>
                  <CardDescription>{getDisplayDescription(dashboard.description)}</CardDescription>
                </CardHeader>
              </Link>
              <CardContent className="pt-0 flex justify-end">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault();
                    deleteMutation.mutate(dashboard.id);
                  }}
                  data-testid={`button-delete-dashboard-${dashboard.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
