import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ResultsTable } from "@/components/ResultsTable";
import { ArrowLeft, Search, Filter, Scissors, Download, Loader2 } from "lucide-react";
import { Link } from "wouter";

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 3);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

type ItemTypeFilter = "moulding" | "matboard" | "covering" | "backing";
type CompletionFilter = "incomplete" | "complete" | "all";
type SaleTypeFilter = "orders_invoices" | "orders" | "invoices" | "quotes" | "all";

export default function CuttingListReport() {
  const { isAdmin } = useAuth();
  const defaults = getDefaultDates();

  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [itemType, setItemType] = useState<ItemTypeFilter>("moulding");
  const [completion, setCompletion] = useState<CompletionFilter>("incomplete");
  const [saleType, setSaleType] = useState<SaleTypeFilter>("orders_invoices");

  const [appliedFilters, setAppliedFilters] = useState({
    itemType: "moulding" as ItemTypeFilter,
    completion: "incomplete" as CompletionFilter,
    saleType: "orders_invoices" as SaleTypeFilter,
    startDate: defaults.startDate,
    endDate: defaults.endDate,
  });

  const [hasSearched, setHasSearched] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      "cutting-list-report",
      appliedFilters.itemType,
      appliedFilters.completion,
      appliedFilters.saleType,
      appliedFilters.startDate,
      appliedFilters.endDate,
    ],
    queryFn: async () => {
      const res = await apiRequest("POST", api.reportBuilders.cuttingList.path, {
        itemType: appliedFilters.itemType,
        completion: appliedFilters.completion,
        saleType: appliedFilters.saleType,
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
      });
      return res.json();
    },
    enabled: hasSearched,
    staleTime: 30000,
  });

  const handleSearch = () => {
    setAppliedFilters({
      itemType,
      completion,
      saleType,
      startDate,
      endDate,
    });
    setHasSearched(true);
  };

  const handleExportCsv = () => {
    if (!data?.rows?.length) return;
    const cols = data.columns as string[];
    const rows = data.rows as Record<string, any>[];
    const csvLines = [
      cols.join(","),
      ...rows.map((row) =>
        cols.map((c) => {
          const val = row[c] ?? "";
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(",")
      ),
    ];
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cutting-list-${appliedFilters.itemType}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resultRows = data?.rows || [];
  const resultCols = data?.columns || [];

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboards/items">
          <Button variant="ghost" size="icon" data-testid="button-back-items">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            Cutting List Report
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            View and filter your cutting list items
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Item Type</Label>
              <Select value={itemType} onValueChange={(v) => setItemType(v as ItemTypeFilter)}>
                <SelectTrigger data-testid="select-item-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="moulding">Moulding</SelectItem>
                  <SelectItem value="matboard">Matboard</SelectItem>
                  <SelectItem value="covering">Covering</SelectItem>
                  <SelectItem value="backing">Backing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
              <Select value={completion} onValueChange={(v) => setCompletion(v as CompletionFilter)}>
                <SelectTrigger data-testid="select-completion">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Sale Type</Label>
              <Select value={saleType} onValueChange={(v) => setSaleType(v as SaleTypeFilter)}>
                <SelectTrigger data-testid="select-sale-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="orders_invoices">Orders + Invoices</SelectItem>
                  <SelectItem value="orders">Orders Only</SelectItem>
                  <SelectItem value="invoices">Invoices Only</SelectItem>
                  <SelectItem value="quotes">Quotes Only</SelectItem>
                  <SelectItem value="all">All Types</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">From Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-cutting-start-date"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">To Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-cutting-end-date"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <Button onClick={handleSearch} disabled={isLoading} data-testid="button-search-cutting-list">
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {isLoading ? "Searching..." : "Search"}
            </Button>
            {resultRows.length > 0 && (
              <Button variant="outline" onClick={handleExportCsv} data-testid="button-export-csv">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
            {hasSearched && data && (
              <div className="flex items-center gap-2 ml-auto">
                <Badge variant="secondary" className="text-xs">
                  {resultRows.length} items
                </Badge>
                {data.executionTimeMs && (
                  <span className="text-xs text-muted-foreground">
                    {(data.executionTimeMs / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="py-4">
            <p className="text-destructive text-sm">{(error as Error).message}</p>
          </CardContent>
        </Card>
      )}

      {!hasSearched ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Scissors className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Set your filters and search</h3>
            <p className="text-muted-foreground text-center text-sm max-w-md">
              Choose your item type, date range, and other options above, then click Search to load your cutting list.
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
            <span className="text-muted-foreground">Loading cutting list...</span>
          </CardContent>
        </Card>
      ) : resultRows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h3 className="text-lg font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground text-center text-sm">
              Try adjusting your filters or date range.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-auto">
              <ResultsTable columns={resultCols} data={resultRows} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
