import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getAuthToken } from "@/hooks/use-auth";
import { api } from "@shared/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft, ChevronRight, Bell } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, BarChart, Bar, Legend, Cell
} from "recharts";

function formatCurrency(val: number | string | null | undefined): string {
  const num = typeof val === "string" ? parseFloat(val) : (val ?? 0);
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatInt(val: number | string | null | undefined): number {
  if (val === null || val === undefined) return 0;
  return typeof val === "string" ? parseInt(val, 10) || 0 : Math.round(val);
}

function authHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function sanitizeDate(d: string): string {
  return d.replace(/[^0-9-]/g, "").substring(0, 10);
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body ?? {}),
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Request failed");
  }
  return res.json();
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  const days: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Mon","Tue","Wed","Thurs","Fri","Sat","Sun"];

interface OverviewData {
  totalCustomers: number;
  smsRemaining: number;
  notCompletedCount: number;
  notCompletedTotal: number;
  overdueCount: number;
  overdueTotal: number;
  completedNotCollectedCount: number;
  completedNotCollectedTotal: number;
  collectedNotPaidCount: number;
  collectedNotPaidTotal: number;
}

interface TodayData {
  newQuotes: number;
  quotesTotal: number;
  newOrders: number;
  ordersTotal: number;
  newInvoices: number;
  invoicesTotal: number;
  jobsCompleted: number;
  jobsCompletedTotal: number;
  jobsCollected: number;
  jobsCollectedTotal: number;
  totalPayments: number;
  ordersDueToday: number;
  ordersOverdue: number;
}

interface PeriodData {
  quotesCount: number;
  quotesTotal: number;
  ordersCount: number;
  ordersTotal: number;
  invoicesCount: number;
  invoicesTotal: number;
  lineItemsCount: number;
  lineItemsTotal: number;
  completedCount: number;
  completedTotal: number;
  collectedCount: number;
  collectedTotal: number;
  totalPayments: number;
  totalSupplierOrders: number;
  chartData: { period: string; quotes: number; orders: number; invoices: number; completed: number; collected: number; qVal: number; oVal: number; iVal: number; compVal: number; collVal: number }[];
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDisplayDate(d: Date): string {
  const day = d.getDate();
  const month = MONTHS[d.getMonth()].substring(0, 3);
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export default function FramerDashboard() {
  const { user, isAdmin } = useAuth();
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingToday, setLoadingToday] = useState(true);
  const [loadingPeriod, setLoadingPeriod] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [todayData, setTodayData] = useState<TodayData | null>(null);
  const [periodData, setPeriodData] = useState<PeriodData | null>(null);
  const [calendarJobs, setCalendarJobs] = useState<Record<string, number>>({});
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [periodChartMode, setPeriodChartMode] = useState<"count" | "value">("count");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const now = new Date();
  const periodEnd = formatDate(now);
  const periodStart = useMemo(() => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 3);
    return formatDate(d);
  }, []);

  const [periodFrom, setPeriodFrom] = useState(periodStart);
  const [periodTo, setPeriodTo] = useState(periodEnd);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    setErrors(prev => ({ ...prev, overview: "" }));
    try {
      const data = await postJson<OverviewData>(api.framerDashboard.overview.path);
      setOverview(data);
    } catch (e: any) {
      setErrors(prev => ({ ...prev, overview: e.message || "Failed to load overview" }));
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const loadToday = useCallback(async () => {
    setLoadingToday(true);
    setErrors(prev => ({ ...prev, today: "" }));
    try {
      const data = await postJson<TodayData>(api.framerDashboard.today.path);
      setTodayData(data);
    } catch (e: any) {
      setErrors(prev => ({ ...prev, today: e.message || "Failed to load today" }));
    } finally {
      setLoadingToday(false);
    }
  }, []);

  const loadPeriod = useCallback(async (from: string, to: string) => {
    const safeFrom = sanitizeDate(from);
    const safeTo = sanitizeDate(to);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(safeFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(safeTo)) return;
    setLoadingPeriod(true);
    setErrors(prev => ({ ...prev, period: "" }));
    try {
      const data = await postJson<PeriodData>(api.framerDashboard.period.path, { from: safeFrom, to: safeTo });
      setPeriodData(data);
    } catch (e: any) {
      setErrors(prev => ({ ...prev, period: e.message || "Failed to load period" }));
    } finally {
      setLoadingPeriod(false);
    }
  }, []);

  const loadCalendar = useCallback(async (year: number, month: number) => {
    setLoadingCalendar(true);
    setErrors(prev => ({ ...prev, calendar: "" }));
    try {
      const map = await postJson<Record<string, number>>(api.framerDashboard.calendar.path, { year, month });
      setCalendarJobs(map);
    } catch (e: any) {
      setErrors(prev => ({ ...prev, calendar: e.message || "Failed to load calendar" }));
    } finally {
      setLoadingCalendar(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
    loadToday();
    loadPeriod(periodFrom, periodTo);
    loadCalendar(calendarYear, calendarMonth);
  }, []);

  useEffect(() => {
    loadCalendar(calendarYear, calendarMonth);
  }, [calendarYear, calendarMonth]);

  const calendarDays = useMemo(() => getMonthDays(calendarYear, calendarMonth), [calendarYear, calendarMonth]);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === calendarYear && today.getMonth() === calendarMonth;

  function prevMonth() {
    if (calendarMonth === 0) {
      setCalendarYear(calendarYear - 1);
      setCalendarMonth(11);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  }

  function nextMonth() {
    if (calendarMonth === 11) {
      setCalendarYear(calendarYear + 1);
      setCalendarMonth(0);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  }

  const allLoading = loadingOverview && loadingToday && loadingPeriod && loadingCalendar;
  if (allLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="dashboard-loading">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading dashboard...</span>
      </div>
    );
  }

  const todayStr = `${today.getDate()} ${MONTHS[today.getMonth()]}, ${today.getFullYear()}`;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px]" data-testid="framer-dashboard">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
        <Card data-testid="overview-section">
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold text-primary mb-3" data-testid="text-overview-title">Overview</h2>
            {errors.overview && <p className="text-xs text-destructive mb-2">{errors.overview}</p>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Total customers:</span>
                  <span className="text-2xl font-bold" data-testid="text-total-customers">{overview?.totalCustomers ?? 0}</span>
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">SMS remaining:</span>
                  <span className="text-sm font-semibold" data-testid="text-sms-remaining">{overview?.smsRemaining ?? 0}</span>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground mb-1">Jobs ordered</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Not completed:</span>
                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" data-testid="badge-not-completed-count">{overview?.notCompletedCount ?? 0}</Badge>
                  <span className="text-xs font-medium" data-testid="text-not-completed-total">{formatCurrency(overview?.notCompletedTotal)}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-destructive font-medium">Overdue:</span>
                  <Badge variant="outline" className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800" data-testid="badge-overdue-count">{overview?.overdueCount ?? 0}</Badge>
                  <span className="text-xs font-medium text-destructive" data-testid="text-overdue-total">{formatCurrency(overview?.overdueTotal)}</span>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground mb-1">Jobs ordered/Invoiced</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Completed not collected:</span>
                  <Badge variant="outline" data-testid="badge-completed-not-collected">{overview?.completedNotCollectedCount ?? 0}</Badge>
                  <span className="text-xs font-medium" data-testid="text-completed-not-collected-total">{formatCurrency(overview?.completedNotCollectedTotal)}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-destructive font-medium">Collected not paid:</span>
                  <Badge variant="outline" className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800" data-testid="badge-collected-not-paid">{overview?.collectedNotPaidCount ?? 0}</Badge>
                  <span className="text-xs font-medium text-destructive" data-testid="text-collected-not-paid-total">{formatCurrency(overview?.collectedNotPaidTotal)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="calendar-section">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="text-sm font-semibold text-primary">Calendar</h2>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={prevMonth} data-testid="button-calendar-prev">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[120px] text-center" data-testid="text-calendar-month">
                  {MONTHS[calendarMonth]}, {calendarYear}
                </span>
                <Button size="icon" variant="ghost" onClick={nextMonth} data-testid="button-calendar-next">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-0 text-center">
              {DOW.map(d => (
                <div key={d} className="text-[10px] font-medium text-muted-foreground py-1 border-b border-border">{d}</div>
              ))}
              {calendarDays.map((day, i) => {
                if (day === null) return <div key={`e-${i}`} className="h-8 border-b border-r border-border" />;
                const key = `${calendarYear}-${calendarMonth}-${day}`;
                const jobCount = calendarJobs[key] || 0;
                const isToday = isCurrentMonth && day === today.getDate();
                return (
                  <div
                    key={`d-${day}`}
                    className={`h-8 flex flex-col items-center justify-start pt-0.5 text-xs border-b border-r border-border relative ${isToday ? "bg-blue-50 dark:bg-blue-950/30 font-bold" : ""}`}
                    data-testid={`calendar-day-${day}`}
                  >
                    <span>{day}</span>
                    {jobCount > 0 && (
                      <div className="w-4 h-1.5 rounded-sm bg-red-500 mt-0.5" title={`${jobCount} job(s) due`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="today-section">
        <CardContent className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3" data-testid="text-today-title">
            Today - {todayStr}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-[160px]">
              <TodayChart data={todayData} />
            </div>

            <div className="space-y-1.5">
              <StatRow label="New quotes:" count={todayData?.newQuotes ?? 0} value={todayData?.quotesTotal ?? 0} color="bg-blue-500" />
              <StatRow label="New orders:" count={todayData?.newOrders ?? 0} value={todayData?.ordersTotal ?? 0} color="bg-red-500" />
              <StatRow label="New invoices:" count={todayData?.newInvoices ?? 0} value={todayData?.invoicesTotal ?? 0} color="bg-orange-400" />
              <StatRow label="Jobs completed:" count={todayData?.jobsCompleted ?? 0} value={todayData?.jobsCompletedTotal ?? 0} color="bg-green-500" />
              <StatRow label="Jobs collected:" count={todayData?.jobsCollected ?? 0} value={todayData?.jobsCollectedTotal ?? 0} color="bg-yellow-500" />
            </div>

            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Total payments: </span>
                <span className="font-bold text-primary text-lg" data-testid="text-today-total-payments">{formatCurrency(todayData?.totalPayments)}</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground">Orders</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Orders due today:</span>
                  <span className="text-sm font-medium" data-testid="text-orders-due-today">{todayData?.ordersDueToday ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-destructive font-medium">Orders Overdue:</span>
                  <span className="text-sm font-bold text-destructive" data-testid="text-orders-overdue">{todayData?.ordersOverdue ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="period-section">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <h2 className="text-sm font-semibold text-muted-foreground">Period from</h2>
            <Input
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              className="w-40"
              data-testid="input-period-from"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              className="w-40"
              data-testid="input-period-to"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPeriod(periodFrom, periodTo)}
              data-testid="button-refresh-period"
            >
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant={periodChartMode === "count" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPeriodChartMode("count")}
                  data-testid="button-period-count"
                >
                  count
                </Button>
                <Button
                  variant={periodChartMode === "value" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPeriodChartMode("value")}
                  data-testid="button-period-value"
                >
                  $ value
                </Button>
              </div>
              <div className="h-[180px]">
                <PeriodChart data={periodData?.chartData || []} mode={periodChartMode} />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                <PeriodStatRow label="Quotes:" count={periodData?.quotesCount ?? 0} value={periodData?.quotesTotal ?? 0} color="bg-blue-500" />
                <PeriodStatRow label="Line Items:" count={periodData?.lineItemsCount ?? 0} value={periodData?.lineItemsTotal ?? 0} color="bg-yellow-400" />
                <PeriodStatRow label="Orders:" count={periodData?.ordersCount ?? 0} value={periodData?.ordersTotal ?? 0} color="bg-red-500" />
                <PeriodStatRow label="Completed:" count={periodData?.completedCount ?? 0} value={periodData?.completedTotal ?? 0} color="bg-green-500" />
                <PeriodStatRow label="Invoices:" count={periodData?.invoicesCount ?? 0} value={periodData?.invoicesTotal ?? 0} color="bg-orange-400" />
                <PeriodStatRow label="Collected:" count={periodData?.collectedCount ?? 0} value={periodData?.collectedTotal ?? 0} color="bg-purple-500" />
              </div>
              <div className="pt-2 border-t border-border mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Total payments:</span>
                  <span className="text-sm font-bold text-primary" data-testid="text-period-total-payments">{formatCurrency(periodData?.totalPayments)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Total supplier orders:</span>
                  <span className="text-sm font-medium" data-testid="text-period-supplier-orders">{periodData?.totalSupplierOrders ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatRow({ label, count, value, color }: { label: string; count: number; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className={`w-3 h-3 rounded-sm ${color} shrink-0`} />
      <span className="text-xs text-muted-foreground min-w-[100px]">{label}</span>
      <span className="text-xs font-medium w-6 text-right">{count}</span>
      <span className="text-xs font-medium">{formatCurrency(value)}</span>
    </div>
  );
}

function PeriodStatRow({ label, count, value, color }: { label: string; count: number; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className={`w-3 h-3 rounded-sm ${color} shrink-0`} />
      <span className="text-xs text-muted-foreground min-w-[80px]">{label}</span>
      <span className="text-xs font-semibold w-6 text-right">{count}</span>
      <span className="text-xs font-medium">{formatCurrency(value)}</span>
    </div>
  );
}

function TodayChart({ data }: { data: TodayData | null }) {
  if (!data) return null;
  const chartData = [
    { name: "Quotes", value: data.newQuotes },
    { name: "Orders", value: data.newOrders },
    { name: "Invoices", value: data.newInvoices },
    { name: "Completed", value: data.jobsCompleted },
    { name: "Collected", value: data.jobsCollected },
  ];
  const colors = ["#3b82f6", "#ef4444", "#f97316", "#22c55e", "#eab308"];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={{ fontSize: 9 }} />
        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
        <ReTooltip />
        <Bar dataKey="value">
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function PeriodChart({ data, mode }: { data: PeriodData["chartData"]; mode: "count" | "value" }) {
  if (!data || data.length === 0) return <div className="text-xs text-muted-foreground flex items-center justify-center h-full">No data</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="period" tick={{ fontSize: 8 }} />
        <YAxis tick={{ fontSize: 10 }} allowDecimals={mode === "count"} />
        <ReTooltip />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        {mode === "count" ? (
          <>
            <Line type="monotone" dataKey="quotes" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Quotes" />
            <Line type="monotone" dataKey="orders" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Orders" />
            <Line type="monotone" dataKey="invoices" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name="Invoices" />
            <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Completed" />
            <Line type="monotone" dataKey="collected" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} name="Collected" />
          </>
        ) : (
          <>
            <Line type="monotone" dataKey="qVal" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Quotes $" />
            <Line type="monotone" dataKey="oVal" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Orders $" />
            <Line type="monotone" dataKey="iVal" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name="Invoices $" />
            <Line type="monotone" dataKey="compVal" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Completed $" />
            <Line type="monotone" dataKey="collVal" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} name="Collected $" />
          </>
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
