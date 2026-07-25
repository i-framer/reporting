import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { api, buildUrl } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Play, Save, Clock, List, ExternalLink, Edit2, Download, Printer } from "lucide-react";
import { SqlEditor } from "@/components/SqlEditor";
import { ResultsTable } from "@/components/ResultsTable";
import { buildCsv } from "@/lib/csv";
import { Link } from "wouter";
import type { DataSource, SavedQuery } from "@shared/schema";

export default function Queries() {
  const [sql, setSql] = useState("SELECT * FROM your_table LIMIT 10;");
  const [selectedDataSource, setSelectedDataSource] = useState<string>("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [queryName, setQueryName] = useState("");
  const [queryDesc, setQueryDesc] = useState("");
  const [showSaved, setShowSaved] = useState(false);

  const { data: dataSources = [] } = useQuery<DataSource[]>({
    queryKey: [api.dataSources.list.path],
  });

  const { data: savedQueries = [] } = useQuery<SavedQuery[]>({
    queryKey: [api.queries.list.path],
  });

  const executeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(api.mysql.execute.method, api.mysql.execute.path, {
        dataSourceId: Number(selectedDataSource),
        sql
      });
      return res.json();
    },
    onSuccess: (data) => {
      setColumns(data.columns || []);
      setRows(data.rows || []);
      setExecutionTime(data.executionTimeMs || null);
    },
    onError: (err: any) => {
      setColumns([]);
      setRows([]);
      alert(err.message || "Query failed");
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(api.queries.create.method, api.queries.create.path, {
        name: queryName,
        description: queryDesc,
        dataSourceId: Number(selectedDataSource),
        sql
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.queries.list.path] });
      setSaveOpen(false);
      setQueryName("");
      setQueryDesc("");
    }
  });

  const loadQuery = (q: SavedQuery) => {
    setSql(q.sql);
    setSelectedDataSource(String(q.dataSourceId));
    setShowSaved(false);
  };

  const escapeHtml = (val: unknown) =>
    String(val ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const downloadCSV = () => {
    if (columns.length === 0) return;
    const csvContent = buildCsv(columns, rows);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `query-results-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const printResults = () => {
    if (columns.length === 0) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const tableHead = `<tr>${columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr>`;
    const tableBody = rows
      .map(
        (row) =>
          `<tr>${columns.map((c) => `<td>${escapeHtml(row[c])}</td>`).join("")}</tr>`
      )
      .join("");
    win.document.write(`<!DOCTYPE html><html><head><title>Query Results</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #1e293b; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        p { color: #64748b; font-size: 12px; margin: 0 0 16px; }
        table { border-collapse: collapse; width: 100%; font-size: 12px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
        th { background: #f1f5f9; }
        tr:nth-child(even) td { background: #f8fafc; }
      </style></head><body>
      <h1>Query Results</h1>
      <p>${rows.length} ${rows.length === 1 ? "row" : "rows"} &middot; ${new Date().toLocaleString()}</p>
      <table><thead>${tableHead}</thead><tbody>${tableBody}</tbody></table>
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Query Editor</h1>
          <p className="text-muted-foreground mt-1">Write and execute SQL queries against your data sources</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowSaved(!showSaved)} data-testid="button-toggle-saved">
            <List className="h-4 w-4 mr-2" />
            Saved Queries
          </Button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {showSaved && (
          <Card className="w-72 shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Saved Queries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {savedQueries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved queries yet</p>
              ) : (
                savedQueries.map((q) => (
                  <div
                    key={q.id}
                    className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <Link href={`/query/${q.id}`}>
                      <div className="cursor-pointer" data-testid={`link-query-report-${q.id}`}>
                        <p className="font-medium text-sm truncate hover:text-primary">{q.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{q.description}</p>
                      </div>
                    </Link>
                    <div className="flex gap-1 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadQuery(q)}
                        className="h-7 text-xs"
                        data-testid={`button-edit-query-${q.id}`}
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Link href={`/query/${q.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          data-testid={`button-view-report-${q.id}`}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Report
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex items-center gap-3">
            <Select value={selectedDataSource} onValueChange={setSelectedDataSource}>
              <SelectTrigger className="w-64" data-testid="select-data-source">
                <SelectValue placeholder="Select data source" />
              </SelectTrigger>
              <SelectContent>
                {dataSources.map((ds) => (
                  <SelectItem key={ds.id} value={String(ds.id)}>{ds.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              onClick={() => executeMutation.mutate()} 
              disabled={!selectedDataSource || !sql || executeMutation.isPending}
              data-testid="button-run-query"
            >
              <Play className="h-4 w-4 mr-2" />
              {executeMutation.isPending ? "Running..." : "Run Query"}
            </Button>

            <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={!sql || !selectedDataSource} data-testid="button-save-query">
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Query</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="qname">Query Name</Label>
                    <Input id="qname" value={queryName} onChange={(e) => setQueryName(e.target.value)} data-testid="input-query-name" />
                  </div>
                  <div>
                    <Label htmlFor="qdesc">Description</Label>
                    <Textarea id="qdesc" value={queryDesc} onChange={(e) => setQueryDesc(e.target.value)} data-testid="input-query-description" />
                  </div>
                  <Button onClick={() => saveMutation.mutate()} disabled={!queryName || saveMutation.isPending} className="w-full" data-testid="button-submit-save-query">
                    {saveMutation.isPending ? "Saving..." : "Save Query"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="flex items-center gap-3 ml-auto">
              {executionTime !== null && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {executionTime}ms
                </div>
              )}

              <Button
                variant="outline"
                onClick={downloadCSV}
                disabled={rows.length === 0}
                data-testid="button-download-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>

              <Button
                variant="outline"
                onClick={printResults}
                disabled={rows.length === 0}
                data-testid="button-print-results"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-[200px]">
            <SqlEditor value={sql} onChange={setSql} />
          </div>

          <div className="flex-1 min-h-[200px]">
            <ResultsTable columns={columns} data={rows} isLoading={executeMutation.isPending} />
          </div>
        </div>
      </div>
    </div>
  );
}
