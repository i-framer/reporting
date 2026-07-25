import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2, Table, BarChart3, LineChart as LineChartIcon, Calendar, RefreshCw, Download, Printer } from "lucide-react";
import { Link, useParams } from "wouter";
import type { Dashboard, Report, SavedQuery } from "@shared/schema";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ResultsTable } from "@/components/ResultsTable";
import { buildCsv } from "@/lib/csv";
import { getAuthToken } from "@/hooks/use-auth";

function authHeaders(): HeadersInit {
  const headers: HeadersInit = {};
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// Helper to get default date range (last 12 months)
function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
}

export default function DashboardView() {
  const params = useParams<{ id: string }>();
  const dashboardId = Number(params.id);
  const [addWidgetOpen, setAddWidgetOpen] = useState(false);
  const [selectedQueryId, setSelectedQueryId] = useState<string>("");
  const [widgetTitle, setWidgetTitle] = useState("");
  const [widgetType, setWidgetType] = useState<string>("table");

  const { data: dashboard, isLoading: loadingDashboard } = useQuery<Dashboard>({
    queryKey: [api.dashboards.get.path, dashboardId],
    queryFn: async () => {
      const res = await fetch(buildUrl(api.dashboards.get.path, { id: dashboardId }), {
        credentials: "include",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Dashboard not found");
      return res.json();
    }
  });

  const { data: reports = [], isLoading: loadingReports } = useQuery<Report[]>({
    queryKey: [api.dashboards.getReports.path, dashboardId],
    queryFn: async () => {
      const res = await fetch(buildUrl(api.dashboards.getReports.path, { id: dashboardId }), {
        credentials: "include",
        headers: authHeaders(),
      });
      return res.json();
    }
  });

  const { data: savedQueries = [] } = useQuery<SavedQuery[]>({
    queryKey: [api.queries.list.path],
  });

  const addWidgetMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(api.reports.create.method, api.reports.create.path, {
        dashboardId,
        queryId: Number(selectedQueryId),
        type: widgetType,
        title: widgetTitle,
        config: {},
        layout: { x: 0, y: 0, w: 12, h: 4 }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.dashboards.getReports.path, dashboardId] });
      setAddWidgetOpen(false);
      setSelectedQueryId("");
      setWidgetTitle("");
      setWidgetType("table");
    }
  });

  const deleteWidgetMutation = useMutation({
    mutationFn: async (reportId: number) => {
      return apiRequest(api.reports.delete.method, buildUrl(api.reports.delete.path, { id: reportId }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.dashboards.getReports.path, dashboardId] });
    }
  });

  const isLoading = loadingDashboard || loadingReports;

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="p-8">
        <p>Dashboard not found</p>
        <Link href="/">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboards
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-display font-bold">{dashboard.name}</h1>
          {dashboard.description && (
            <p className="text-muted-foreground mt-1">{dashboard.description}</p>
          )}
        </div>
        
        <Dialog open={addWidgetOpen} onOpenChange={setAddWidgetOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-widget">
              <Plus className="h-4 w-4 mr-2" />
              Add Widget
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Widget to Dashboard</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="query-select">Select Saved Query</Label>
                <Select value={selectedQueryId} onValueChange={setSelectedQueryId}>
                  <SelectTrigger data-testid="select-widget-query">
                    <SelectValue placeholder="Choose a saved query..." />
                  </SelectTrigger>
                  <SelectContent>
                    {savedQueries.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">
                        No saved queries. Create one in Query Editor first.
                      </div>
                    ) : (
                      savedQueries.map((q) => (
                        <SelectItem key={q.id} value={String(q.id)}>
                          {q.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="widget-title">Widget Title</Label>
                <Input
                  id="widget-title"
                  value={widgetTitle}
                  onChange={(e) => setWidgetTitle(e.target.value)}
                  placeholder="e.g., Framer Sales Summary"
                  data-testid="input-widget-title"
                />
              </div>

              <div>
                <Label>Visualization Type</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setWidgetType("table")}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-colors ${
                      widgetType === "table" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                    }`}
                    data-testid="button-type-table"
                  >
                    <Table className="h-6 w-6 mb-1" />
                    <span className="text-xs">Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWidgetType("bar")}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-colors ${
                      widgetType === "bar" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                    }`}
                    data-testid="button-type-bar"
                  >
                    <BarChart3 className="h-6 w-6 mb-1" />
                    <span className="text-xs">Bar Chart</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWidgetType("line")}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-colors ${
                      widgetType === "line" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                    }`}
                    data-testid="button-type-line"
                  >
                    <LineChartIcon className="h-6 w-6 mb-1" />
                    <span className="text-xs">Line Chart</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setAddWidgetOpen(false)}
                  data-testid="button-cancel-add-widget"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => addWidgetMutation.mutate()}
                  disabled={!selectedQueryId || !widgetTitle || addWidgetMutation.isPending}
                  data-testid="button-submit-add-widget"
                >
                  {addWidgetMutation.isPending ? "Adding..." : "Add Widget"}
                </Button>
              </div>

              {savedQueries.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  <Link href="/queries" className="text-primary hover:underline">
                    Go to Query Editor
                  </Link>{" "}
                  to create and save a query first.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {reports.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">No widgets yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Click "Add Widget" to add a saved query as a visualization.
            </p>
            <Button onClick={() => setAddWidgetOpen(true)} data-testid="button-add-first-widget">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Widget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {reports.map((report) => {
            const query = savedQueries.find(q => q.id === report.queryId);
            
            return (
              <Card key={report.id}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteWidgetMutation.mutate(report.id)}
                    disabled={deleteWidgetMutation.isPending}
                    data-testid={`button-delete-widget-${report.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <ReportWidget report={report} query={query} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReportWidget({ report, query }: { report: Report; query?: SavedQuery }) {
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [appliedDates, setAppliedDates] = useState({ start: defaultRange.startDate, end: defaultRange.endDate });
  
  // Check if query has date-related WHERE clauses
  const hasDateFilter = query?.sql && (
    query.sql.toLowerCase().includes('date_sub') ||
    query.sql.toLowerCase().includes('interval') ||
    query.sql.toLowerCase().includes('curdate') ||
    query.sql.toLowerCase().includes('now()')
  );
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["widget-data", report.id, query?.id, appliedDates.start, appliedDates.end],
    queryFn: async () => {
      if (!query) return null;
      // Run the admin-prepared saved query by id. The server applies the
      // optional date range and scopes the result to the caller's own FramerID,
      // so no raw SQL is ever sent from the client.
      const res = await apiRequest(
        "POST",
        buildUrl(api.queries.run.path, { id: query.id }),
        hasDateFilter
          ? { startDate: appliedDates.start, endDate: appliedDates.end }
          : {}
      );
      return res.json();
    },
    enabled: !!query,
    staleTime: 60000,
  });
  
  const handleApplyDates = () => {
    setAppliedDates({ start: startDate, end: endDate });
  };

  if (!query) {
    return (
      <div className="h-32 flex items-center justify-center text-muted-foreground">
        Query not found
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading data...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-32 flex items-center justify-center text-destructive">
        Failed to load data
      </div>
    );
  }

  const { columns, rows } = data;

  const escapeHtml = (val: unknown) =>
    String(val ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const safeFileName = (report.title || "report").replace(/[^a-z0-9]/gi, "_");

  const downloadCSV = () => {
    if (!columns || columns.length === 0) return;
    const csvContent = buildCsv(columns, rows);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${safeFileName}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const printResults = () => {
    if (!columns || columns.length === 0) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const tableHead = `<tr>${columns.map((c: string) => `<th>${escapeHtml(c)}</th>`).join("")}</tr>`;
    const tableBody = rows
      .map(
        (row: any) =>
          `<tr>${columns.map((c: string) => `<td>${escapeHtml(row[c])}</td>`).join("")}</tr>`
      )
      .join("");
    win.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(report.title)}</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #1e293b; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        p { color: #64748b; font-size: 12px; margin: 0 0 16px; }
        table { border-collapse: collapse; width: 100%; font-size: 12px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
        th { background: #f1f5f9; }
        tr:nth-child(even) td { background: #f8fafc; }
      </style></head><body>
      <h1>${escapeHtml(report.title)}</h1>
      <p>${rows.length} ${rows.length === 1 ? "row" : "rows"} &middot; ${new Date().toLocaleString()}</p>
      <table><thead>${tableHead}</thead><tbody>${tableBody}</tbody></table>
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const ExportControls = () => (
    <div className="flex items-center justify-end gap-2 mb-3">
      <Button
        variant="outline"
        size="sm"
        onClick={downloadCSV}
        disabled={!rows || rows.length === 0}
        data-testid={`button-download-csv-${report.id}`}
      >
        <Download className="h-3.5 w-3.5 mr-1.5" />
        CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={printResults}
        disabled={!rows || rows.length === 0}
        data-testid={`button-print-${report.id}`}
      >
        <Printer className="h-3.5 w-3.5 mr-1.5" />
        Print
      </Button>
    </div>
  );

  // Date range filter UI
  const DateRangeFilter = () => (
    <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-muted/50 rounded-md">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center gap-1">
        <Label className="text-xs text-muted-foreground">From:</Label>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-8 w-36 text-xs"
          data-testid={`input-start-date-${report.id}`}
        />
      </div>
      <div className="flex items-center gap-1">
        <Label className="text-xs text-muted-foreground">To:</Label>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="h-8 w-36 text-xs"
          data-testid={`input-end-date-${report.id}`}
        />
      </div>
      <Button 
        size="sm" 
        onClick={handleApplyDates}
        className="h-8"
        data-testid={`button-apply-dates-${report.id}`}
      >
        <RefreshCw className="h-3 w-3 mr-1" />
        Apply
      </Button>
    </div>
  );

  if (report.type === "table") {
    return (
      <div>
        <ExportControls />
        {hasDateFilter && <DateRangeFilter />}
        <div className="max-h-96 overflow-auto">
          <ResultsTable columns={columns || []} data={rows || []} />
        </div>
      </div>
    );
  }

  if (report.type === "bar" && rows?.length > 0) {
    // Check if there's a category column (3+ columns with a text category in position 2 or 3)
    const hasCategoryColumn = columns.length >= 4 && 
      rows.some((r: any) => typeof r[columns[2]] === 'string');
    
    if (hasCategoryColumn) {
      // Grouped bar chart: pivot data by category
      const labelKey = columns[1]; // week_start
      const categoryKey = columns[2]; // plan_type  
      const countKey = columns[3]; // renewals (count)
      const amountKey = columns.length > 4 ? columns[4] : null; // total_amount
      
      const categories = Array.from(new Set(rows.map((r: any) => String(r[categoryKey]))));
      const colors = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
      
      // Group by label - store both count and amount per category
      const grouped: Record<string, any> = {};
      rows.forEach((row: any) => {
        const label = String(row[labelKey]);
        const category = String(row[categoryKey]);
        if (!grouped[label]) grouped[label] = { name: label };
        grouped[label][category] = Number(row[countKey]) || 0;
        if (amountKey) {
          grouped[label][`${category}_amount`] = Number(row[amountKey]) || 0;
        }
      });
      
      const chartData = Object.values(grouped).slice(0, 20);
      
      // Custom tooltip to show count and amount
      const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
          return (
            <div className="bg-background border rounded-md p-2 shadow-md text-xs">
              <p className="font-medium mb-1">{label}</p>
              {payload.map((entry: any, idx: number) => {
                const amount = entry.payload[`${entry.dataKey}_amount`];
                return (
                  <p key={idx} style={{ color: entry.fill }}>
                    {entry.dataKey}: {entry.value} subscriptions
                    {amount !== undefined && ` ($${Number(amount).toFixed(0)})`}
                  </p>
                );
              })}
            </div>
          );
        }
        return null;
      };
      
      return (
        <div>
          <ExportControls />
          {hasDateFilter && <DateRangeFilter />}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 9 }} interval={0} angle={-45} textAnchor="end" height={70} />
                <YAxis className="text-xs" label={{ value: 'Subscriptions', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {categories.map((cat, idx) => (
                  <Bar key={cat} dataKey={cat} name={cat} fill={colors[idx % colors.length]} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }
    
    // Simple bar chart
    const labelKey = columns[0];
    const valueKey = columns[1];
    const chartData = rows.slice(0, 20).map((row: any) => ({
      name: String(row[labelKey] || ""),
      value: Number(row[valueKey]) || 0
    }));

    return (
      <div>
        <ExportControls />
        {hasDateFilter && <DateRangeFilter />}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={60} />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (report.type === "line" && rows?.length > 0) {
    const labelKey = columns[0];
    const valueKey = columns[1];
    const chartData = rows.slice(0, 50).map((row: any) => ({
      name: String(row[labelKey] || ""),
      value: Number(row[valueKey]) || 0
    }));

    return (
      <div>
        <ExportControls />
        {hasDateFilter && <DateRangeFilter />}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="h-32 flex items-center justify-center text-muted-foreground">
      No data available
    </div>
  );
}
