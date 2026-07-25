import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { api, buildUrl } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Database, Trash2, CheckCircle, XCircle } from "lucide-react";
import type { DataSource } from "@shared/schema";

export default function Sources() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("3306");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [database, setDatabase] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data: sources = [], isLoading } = useQuery<DataSource[]>({
    queryKey: [api.dataSources.list.path],
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(api.mysql.testConnection.method, api.mysql.testConnection.path, {
        name,
        type: "mysql",
        config: { host, port: Number(port), user, password, database }
      });
      return res.json();
    },
    onSuccess: (data) => {
      setTestResult({ success: true, message: data.message || "Connection successful" });
    },
    onError: (err: any) => {
      setTestResult({ success: false, message: err.message || "Connection failed" });
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(api.dataSources.create.method, api.dataSources.create.path, {
        name,
        type: "mysql",
        config: { host, port: Number(port), user, password, database }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.dataSources.list.path] });
      setOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(api.dataSources.delete.method, buildUrl(api.dataSources.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.dataSources.list.path] });
    }
  });

  const resetForm = () => {
    setName("");
    setHost("");
    setPort("3306");
    setUser("");
    setPassword("");
    setDatabase("");
    setTestResult(null);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Data Sources</h1>
          <p className="text-muted-foreground mt-1">Connect to your MySQL databases</p>
        </div>
        
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-source">
              <Plus className="h-4 w-4 mr-2" />
              Add Data Source
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add MySQL Data Source</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="name">Connection Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Production DB" data-testid="input-source-name" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="host">Host</Label>
                  <Input id="host" value={host} onChange={(e) => setHost(e.target.value)} placeholder="localhost" data-testid="input-source-host" />
                </div>
                <div>
                  <Label htmlFor="port">Port</Label>
                  <Input id="port" value={port} onChange={(e) => setPort(e.target.value)} placeholder="3306" data-testid="input-source-port" />
                </div>
              </div>
              <div>
                <Label htmlFor="user">Username</Label>
                <Input id="user" value={user} onChange={(e) => setUser(e.target.value)} placeholder="root" data-testid="input-source-user" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="input-source-password" />
              </div>
              <div>
                <Label htmlFor="database">Database</Label>
                <Input id="database" value={database} onChange={(e) => setDatabase(e.target.value)} placeholder="myapp" data-testid="input-source-database" />
              </div>

              {testResult && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${testResult.success ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}>
                  {testResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  <span className="text-sm">{testResult.message}</span>
                </div>
              )}

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => testMutation.mutate()} 
                  disabled={!host || !user || !database || testMutation.isPending}
                  className="flex-1"
                  data-testid="button-test-connection"
                >
                  {testMutation.isPending ? "Testing..." : "Test Connection"}
                </Button>
                <Button 
                  onClick={() => createMutation.mutate()} 
                  disabled={!name || !host || !user || !database || createMutation.isPending}
                  className="flex-1"
                  data-testid="button-save-source"
                >
                  {createMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-3/4 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : sources.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No data sources</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add a MySQL database connection to get started
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Data Source
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sources.map((source) => {
            const config = source.config as any;
            return (
              <Card key={source.id} data-testid={`card-source-${source.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    {source.name}
                  </CardTitle>
                  <CardDescription>
                    {config?.host}:{config?.port} / {config?.database}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => deleteMutation.mutate(source.id)}
                    data-testid={`button-delete-source-${source.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
