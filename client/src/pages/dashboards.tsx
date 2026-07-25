import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { api, buildUrl } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, LayoutDashboard, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import type { Dashboard } from "@shared/schema";

export default function Dashboards() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: dashboards = [], isLoading } = useQuery<Dashboard[]>({
    queryKey: [api.dashboards.list.path],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(api.dashboards.create.method, api.dashboards.create.path, { name, description });
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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Dashboards</h1>
          <p className="text-muted-foreground mt-1">View and manage your reporting dashboards</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-dashboard">
              <Plus className="h-4 w-4 mr-2" />
              New Dashboard
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Dashboard</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Sales Overview"
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
                {createMutation.isPending ? "Creating..." : "Create Dashboard"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
      ) : dashboards.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LayoutDashboard className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No dashboards yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first dashboard to start visualizing your data
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboards.map((dashboard) => (
            <Card key={dashboard.id} className="group hover-elevate cursor-pointer" data-testid={`card-dashboard-${dashboard.id}`}>
              <Link href={`/dashboard/${dashboard.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LayoutDashboard className="h-5 w-5 text-primary" />
                    {dashboard.name}
                  </CardTitle>
                  <CardDescription>{dashboard.description || "No description"}</CardDescription>
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
      )}
    </div>
  );
}
