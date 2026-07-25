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
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Search, Filter, Briefcase, Download, Loader2 } from "lucide-react";
import { Link } from "wouter";

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 6);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

type SaleTypeFilter = "orders_invoices" | "orders" | "invoices" | "quotes" | "all";
type CompletionFilter = "incomplete" | "complete" | "all";
type CollectionFilter = "uncollected" | "collected" | "all";
type DateTypeFilter = "created" | "due";
type OrderByField = "created" | "due" | "number" | "customer" | "description";
type OrderDir = "asc" | "desc";

export default function JobListReport() {
  useAuth();
  const defaults = getDefaultDates();

  const [saleType, setSaleType] = useState<SaleTypeFilter>("orders_invoices");
  const [completion, setCompletion] = useState<CompletionFilter>("incomplete");
  const [collection, setCollection] = useState<CollectionFilter>("uncollected");
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [dateType, setDateType] = useState<DateTypeFilter>("created");
  const [orderBy, setOrderBy] = useState<OrderByField>("created");
  const [orderDir, setOrderDir] = useState<OrderDir>("asc");
  const [includeHidden, setIncludeHidden] = useState(false);
  const [includeAmounts, setIncludeAmounts] = useState(false);

  const [appliedFilters, setAppliedFilters] = useState({
    saleType: "orders_invoices" as SaleTypeFilter,
    completion: "incomplete" as CompletionFilter,
    collection: "uncollected" as CollectionFilter,
    startDate: defaults.startDate,
    endDate: defaults.endDate,
    dateType: "created" as DateTypeFilter,
    orderBy: "created" as OrderByField,
    orderDir: "asc" as OrderDir,
    includeHidden: false,
    includeAmounts: false,
  });

  const [hasSearched, setHasSearched] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "job-list-report",
      appliedFilters.saleType,
      appliedFilters.completion,
      appliedFilters.collection,
      appliedFilters.startDate,
      appliedFilters.endDate,
      appliedFilters.dateType,
      appliedFilters.orderBy,
      appliedFilters.orderDir,
      appliedFilters.includeHidden,
      appliedFilters.includeAmounts,
    ],
    queryFn: async () => {
      const res = await apiRequest("POST", api.reportBuilders.jobList.path, {
        saleType: appliedFilters.saleType,
        completion: appliedFilters.completion,
        collection: appliedFilters.collection,
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
        dateType: appliedFilters.dateType,
        orderBy: appliedFilters.orderBy,
        orderDir: appliedFilters.orderDir,
        includeHidden: appliedFilters.includeHidden,
        includeAmounts: appliedFilters.includeAmounts,
      });
      return res.json();
    },
    enabled: hasSearched,
    staleTime: 30000,
  });

  const handleSearch = () => {
    setAppliedFilters({
      saleType,
      completion,
      collection,
      startDate,
      endDate,
      dateType,
      orderBy,
      orderDir,
      includeHidden,
      includeAmounts,
    });
    setHasSearched(true);
  };

  const handleExportCsv = () => {
    if (!data?.rows?.length) return;
    const cols = data.columns as string[];
    const rows = data.rows as Record<string, any>[];
    const csvLines = [
      cols.join(","),
      ...rows.map((row: Record<string, any>) =>
        cols.map((c: string) => {
          const val = row[c] ?? "";
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(",")
      ),
    ];
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-list-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resultRows = data?.rows || [];
  const resultCols = data?.columns || [];

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboards/framer">
          <Button variant="ghost" size="icon" data-testid="button-back-framer">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            Jobs Listing
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            View and filter your jobs
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Sale Type</Label>
              <Select value={saleType} onValueChange={(v) => setSaleType(v as SaleTypeFilter)}>
                <SelectTrigger data-testid="select-job-sale-type">
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
              <Label className="text-xs text-muted-foreground mb-1.5 block">Completion</Label>
              <Select value={completion} onValueChange={(v) => setCompletion(v as CompletionFilter)}>
                <SelectTrigger data-testid="select-job-completion">
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
              <Label className="text-xs text-muted-foreground mb-1.5 block">Collection</Label>
              <Select value={collection} onValueChange={(v) => setCollection(v as CollectionFilter)}>
                <SelectTrigger data-testid="select-job-collection">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncollected">Uncollected</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">From Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-job-start-date"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">To Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-job-end-date"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Date Type</Label>
              <Select value={dateType} onValueChange={(v) => setDateType(v as DateTypeFilter)}>
                <SelectTrigger data-testid="select-job-date-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="due">Due</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Order By</Label>
              <Select value={orderBy} onValueChange={(v) => setOrderBy(v as OrderByField)}>
                <SelectTrigger data-testid="select-job-order-by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">Created Date</SelectItem>
                  <SelectItem value="due">Due Date</SelectItem>
                  <SelectItem value="number">Sale Number</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="description">Description</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Direction</Label>
              <Select value={orderDir} onValueChange={(v) => setOrderDir(v as OrderDir)}>
                <SelectTrigger data-testid="select-job-order-dir">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-4 col-span-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeAmounts"
                  checked={includeAmounts}
                  onCheckedChange={(v) => setIncludeAmounts(v === true)}
                  data-testid="checkbox-include-amounts"
                />
                <Label htmlFor="includeAmounts" className="text-sm cursor-pointer">Include Amounts</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeHidden"
                  checked={includeHidden}
                  onCheckedChange={(v) => setIncludeHidden(v === true)}
                  data-testid="checkbox-include-hidden"
                />
                <Label htmlFor="includeHidden" className="text-sm cursor-pointer">Include Hidden</Label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <Button onClick={handleSearch} disabled={isLoading} data-testid="button-search-job-list">
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {isLoading ? "Searching..." : "Show"}
            </Button>
            {resultRows.length > 0 && (
              <Button variant="outline" onClick={handleExportCsv} data-testid="button-export-job-csv">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
            {hasSearched && data && (
              <div className="flex items-center gap-2 ml-auto">
                <Badge variant="secondary" className="text-xs">
                  {resultRows.length} jobs
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
            <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Set your filters and search</h3>
            <p className="text-muted-foreground text-center text-sm max-w-md">
              Choose your sale type, date range, and other options above, then click Show to load your jobs listing.
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
            <span className="text-muted-foreground">Loading jobs...</span>
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
              <table className="w-full text-sm" data-testid="table-job-list">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr className="border-b">
                    {(resultCols as string[]).map((col: string) => (
                      <th key={col} className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(resultRows as Record<string, any>[]).map((row: Record<string, any>, idx: number) => (
                    <tr key={idx} className="border-b hover-elevate">
                      {(resultCols as string[]).map((col: string) => (
                        <td key={col} className="px-3 py-2 whitespace-nowrap">
                          {col === "Tags" && row[col] ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              {String(row[col]).split(", ").map((tag: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          ) : col === "Status" ? (
                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${row[col] === "Complete" ? "bg-green-500" : "bg-red-500"}`} />
                          ) : col === "Complete" || col === "Collected" ? (
                            <span>{row[col] === "Yes" ? "Yes" : ""}</span>
                          ) : (
                            <span>{row[col] ?? ""}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
