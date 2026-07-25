import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Database, Terminal, BarChart3, LogIn } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { setAuthToken } from "@/hooks/use-auth";

export default function Landing() {
  const [framerId, setFramerId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          framerId: isAdmin ? null : framerId, 
          isAdmin 
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Store token for fallback auth when cookies don't work
      if (data.token) {
        setAuthToken(data.token);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin && !framerId.trim()) {
      toast({
        title: "Framer ID Required",
        description: "Please enter a Framer ID or select Administration mode",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="lg:w-1/2 bg-gradient-to-br from-primary/10 via-background to-background p-8 lg:p-16 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <LayoutDashboard className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-2xl">DataDeck</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-display font-bold leading-tight mb-6">
            Connect to your MySQL database and build reports
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-md">
            Write SQL queries, visualize your data with charts, and create beautiful dashboards - all in one place.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
              <Database className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">MySQL Support</span>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
              <Terminal className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">SQL Editor</span>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Charts & Tables</span>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground">
          DataDeck Reporting App
        </p>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-card">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-display">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to access your dashboards and reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="framerId">Framer ID</Label>
                <Input
                  id="framerId"
                  type="text"
                  placeholder="Enter your Framer ID"
                  value={framerId}
                  onChange={(e) => setFramerId(e.target.value)}
                  disabled={isAdmin}
                  data-testid="input-framer-id"
                />
                <p className="text-xs text-muted-foreground">
                  Your unique framer identifier from the system
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="admin" 
                  checked={isAdmin}
                  onCheckedChange={(checked) => setIsAdmin(checked === true)}
                  data-testid="checkbox-admin"
                />
                <Label 
                  htmlFor="admin" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Sign in as Administration (access all data)
                </Label>
              </div>

              <Button 
                type="submit" 
                size="lg" 
                className="w-full" 
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
