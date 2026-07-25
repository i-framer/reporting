import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  Database, 
  Terminal, 
  LogOut,
  Bot,
  Shield,
  Building,
  Scissors,
  Gauge,
  FileBarChart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout, isAdmin, framerName } = useAuth();

  const dashboardCategories = [
    { href: "/framer-dashboard", label: "Framer Dashboard" },
    { href: "/dashboards/admin", label: "Administration Reports" },
    { href: "/dashboards/framer", label: "Framer Reports" },
    { href: "/dashboards/items", label: "Item Reports" },
  ];

  const links = isAdmin
    ? [
        { href: "/ai-assistant", label: "AI Assistant", icon: Bot },
        { href: "/cut-list-optimizer", label: "Cut List Optimizer", icon: Scissors },
        { href: "/queries", label: "Query Editor", icon: Terminal },
        { href: "/sources", label: "Data Sources", icon: Database },
      ]
    : [
        { href: "/reports", label: "Reports", icon: FileBarChart },
        { href: "/cut-list-optimizer", label: "Cut List Optimizer", icon: Scissors },
      ];

  return (
    <div className="flex flex-col h-screen w-64 bg-card border-r border-border shrink-0 sticky top-0">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">DataDeck</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <div className="mb-4">
          <div className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <LayoutDashboard className="h-4 w-4" />
            Dashboards
          </div>
          <div className="ml-4 space-y-1">
            {dashboardCategories.map((cat) => {
              const isActive = location === cat.href;
              return (
                <Link key={cat.href} href={cat.href} className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-primary/10 text-primary shadow-sm" 
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )} data-testid={`link-${cat.href.replace(/\//g, '-')}`}>
                  {cat.label}
                </Link>
              );
            })}
          </div>
        </div>

        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          
          return (
            <Link key={link.href} href={link.href} className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              isActive 
                ? "bg-primary/10 text-primary shadow-sm" 
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}>
              <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-4 px-2">
          <Avatar className="h-8 w-8 border border-border">
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
              {isAdmin ? <Shield className="h-4 w-4" /> : <Building className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-framer-name">
              {framerName || "Unknown"}
            </p>
            <Badge variant="secondary" className="text-xs">
              {isAdmin ? "Admin Access" : "Framer Access"}
            </Badge>
          </div>
        </div>
        
        <button
          onClick={() => logout()}
          className="flex items-center w-full gap-3 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </div>
    </div>
  );
}
