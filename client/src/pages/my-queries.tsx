import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import type { SavedQuery } from "@shared/schema";

export default function MyQueries() {
  const { data: savedQueries = [], isLoading } = useQuery<SavedQuery[]>({
    queryKey: [api.queries.list.path],
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Run the reports prepared for your portal. Results are scoped to your own data.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : savedQueries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileBarChart className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-1">No reports available yet</h3>
            <p className="text-muted-foreground">
              An administrator hasn't prepared any reports for your portal yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedQueries.map((q) => (
            <Card key={q.id} className="flex flex-col" data-testid={`card-report-${q.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileBarChart className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{q.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-muted-foreground flex-1 min-h-[2.5rem]">
                  {q.description || "No description"}
                </p>
                <Link href={`/query/${q.id}`}>
                  <Button className="w-full mt-3" data-testid={`button-run-report-${q.id}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Report
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
