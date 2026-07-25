import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Database, Hash, DollarSign, Calendar, Download, FileText } from "lucide-react";
import { Link, useParams } from "wouter";
import type { SavedQuery } from "@shared/schema";
import { ResultsTable } from "@/components/ResultsTable";
import { buildCsv } from "@/lib/csv";
import { getAuthToken, useAuth } from "@/hooks/use-auth";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function authHeaders(): HeadersInit {
  const headers: HeadersInit = {};
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export default function QueryReport() {
  const params = useParams<{ id: string }>();
  const queryId = Number(params.id);
  const { isAdmin } = useAuth();
  const backHref = isAdmin ? "/queries" : "/reports";

  const { data: savedQuery, isLoading: loadingQuery } = useQuery<SavedQuery>({
    queryKey: [api.queries.get.path, queryId],
    queryFn: async () => {
      const res = await fetch(buildUrl(api.queries.get.path, { id: queryId }), {
        credentials: "include",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Query not found");
      return res.json();
    }
  });

  const { data: results, isLoading: loadingResults, error } = useQuery({
    queryKey: ["query-results", queryId],
    queryFn: async () => {
      if (!savedQuery) return null;
      const res = await apiRequest("POST", buildUrl(api.queries.run.path, { id: queryId }), {});
      return res.json();
    },
    enabled: !!savedQuery,
  });

  const isLoading = loadingQuery || loadingResults;

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="grid grid-cols-4 gap-4">
            <div className="h-24 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
          </div>
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!savedQuery) {
    return (
      <div className="p-8">
        <p>Query not found</p>
        <Link href={backHref}>
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
        </Link>
      </div>
    );
  }

  const columns = results?.columns || [];
  const rows = results?.rows || [];
  const summaryStats = calculateSummaryStats(columns, rows);

  function downloadCSV() {
    if (columns.length === 0) return;

    const csvContent = buildCsv(columns, rows);

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${savedQuery.name.replace(/[^a-z0-9]/gi, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function downloadPDF() {
    if (columns.length === 0) return;
    
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(savedQuery.name, 14, 22);
    
    if (savedQuery.description) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(savedQuery.description, 14, 30);
    }
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    let yPos = savedQuery.description ? 40 : 32;
    
    summaryStats.forEach((stat, idx) => {
      doc.text(`${stat.label}: ${stat.value}`, 14, yPos + (idx * 8));
    });
    
    yPos += summaryStats.length * 8 + 10;
    
    autoTable(doc, {
      startY: yPos,
      head: [columns],
      body: rows.map(row => columns.map(col => String(row[col] ?? ""))),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [66, 66, 66] },
    });
    
    doc.save(`${savedQuery.name.replace(/[^a-z0-9]/gi, "_")}.pdf`);
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href={backHref}>
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-display font-bold">{savedQuery.name}</h1>
          {savedQuery.description && (
            <p className="text-muted-foreground mt-1">{savedQuery.description}</p>
          )}
        </div>
        <div className="flex gap-2">
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
            onClick={downloadPDF}
            disabled={rows.length === 0}
            data-testid="button-download-pdf"
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          {isAdmin && (
            <Link href="/queries">
              <Button variant="outline" data-testid="button-edit-query">
                Edit Query
              </Button>
            </Link>
          )}
        </div>
      </div>

      {error ? (
        <Card className="border-destructive">
          <CardContent className="py-8 text-center text-destructive">
            Failed to load data. Check your query syntax.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {summaryStats.map((stat, idx) => (
              <Card key={idx}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  {stat.icon}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Data ({rows.length} {rows.length === 1 ? "row" : "rows"})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[500px] overflow-auto">
                <ResultsTable columns={columns} data={rows} />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function calculateSummaryStats(columns: string[], rows: any[]) {
  const stats: { label: string; value: string; subtitle?: string; icon: React.ReactNode }[] = [];

  stats.push({
    label: "Total Records",
    value: rows.length.toLocaleString(),
    icon: <Database className="h-4 w-4 text-muted-foreground" />
  });

  for (const col of columns.slice(0, 3)) {
    const values = rows.map(r => r[col]);
    const numericValues = values.filter(v => typeof v === "number" || (!isNaN(Number(v)) && v !== null && v !== ""));
    
    if (numericValues.length === rows.length && rows.length > 0) {
      const nums = numericValues.map(v => Number(v));
      const sum = nums.reduce((a, b) => a + b, 0);
      const isMoneyColumn = col.toLowerCase().includes("total") || 
                            col.toLowerCase().includes("sales") || 
                            col.toLowerCase().includes("price") ||
                            col.toLowerCase().includes("amount");
      
      if (isMoneyColumn) {
        stats.push({
          label: `Total ${formatColumnName(col)}`,
          value: `$${sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          icon: <DollarSign className="h-4 w-4 text-muted-foreground" />
        });
      } else if (col.toLowerCase().includes("count") || col.toLowerCase().includes("total")) {
        stats.push({
          label: `Total ${formatColumnName(col)}`,
          value: sum.toLocaleString(),
          icon: <Hash className="h-4 w-4 text-muted-foreground" />
        });
      }
    } else if (col.toLowerCase().includes("date")) {
      const dates = values.filter(v => v).map(v => new Date(v)).filter(d => !isNaN(d.getTime()));
      if (dates.length > 0) {
        const latest = new Date(Math.max(...dates.map(d => d.getTime())));
        stats.push({
          label: `Latest ${formatColumnName(col)}`,
          value: latest.toLocaleDateString(),
          icon: <Calendar className="h-4 w-4 text-muted-foreground" />
        });
      }
    }
  }

  while (stats.length < 4) {
    const uniqueCols = columns.filter(c => {
      const uniqueVals = new Set(rows.map(r => r[c]));
      return uniqueVals.size < rows.length && uniqueVals.size > 1;
    });
    
    if (uniqueCols.length > 0 && stats.length < 4) {
      const col = uniqueCols[0];
      const uniqueCount = new Set(rows.map(r => r[col])).size;
      stats.push({
        label: `Unique ${formatColumnName(col)}`,
        value: uniqueCount.toLocaleString(),
        icon: <Hash className="h-4 w-4 text-muted-foreground" />
      });
      break;
    }
    break;
  }

  return stats.slice(0, 4);
}

function formatColumnName(col: string): string {
  return col
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
}
