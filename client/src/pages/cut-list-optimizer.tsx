import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Play, RotateCcw, Ruler, Scissors, BarChart3, AlertTriangle, Download, Loader2, CalendarDays } from "lucide-react";
import { getAuthToken } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  type CutPart,
  type StockSheet,
  type LinearPart,
  type LinearStock,
  type SheetResult,
  type LinearResult,
  type OptimizationStats,
  optimizeSheetCut,
  optimizeLinearCut,
  getPartColor,
  mmToInches,
  inchesToMm,
} from "@/lib/cutting-optimizer";

type CutMode = "sheet" | "linear";
type UnitSystem = "metric" | "imperial";

let partCounter = 1;
let stockCounter = 1;

function createPart(): CutPart {
  return { id: String(partCounter++), label: `Panel ${partCounter - 1}`, length: 0, width: 0, quantity: 1 };
}

function createStock(): StockSheet {
  return { id: String(stockCounter++), length: 0, width: 0, quantity: 1 };
}

function createLinearPart(): LinearPart {
  return { id: String(partCounter++), label: `Part ${partCounter - 1}`, length: 0, quantity: 1 };
}

function createLinearStock(): LinearStock {
  return { id: String(stockCounter++), length: 0, quantity: 1 };
}

export default function CutListOptimizer() {
  const [mode, setMode] = useState<CutMode>("sheet");
  const [unit, setUnit] = useState<UnitSystem>("metric");
  const [kerf, setKerf] = useState<number>(3);
  const [considerGrain, setConsiderGrain] = useState(false);

  const [sheetParts, setSheetParts] = useState<CutPart[]>([createPart()]);
  const [sheetStocks, setSheetStocks] = useState<StockSheet[]>([createStock()]);
  const [linearParts, setLinearParts] = useState<LinearPart[]>([createLinearPart()]);
  const [linearStocks, setLinearStocks] = useState<LinearStock[]>([createLinearStock()]);

  const [sheetResults, setSheetResults] = useState<SheetResult[] | null>(null);
  const [linearResults, setLinearResults] = useState<LinearResult[] | null>(null);
  const [stats, setStats] = useState<OptimizationStats | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isLoadingCutList, setIsLoadingCutList] = useState(false);
  const [loadedItemType, setLoadedItemType] = useState<string | null>(null);
  const [loadPopoverOpen, setLoadPopoverOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [loadItemType, setLoadItemType] = useState<string>('all');
  const { toast } = useToast();

  const unitLabel = unit === "metric" ? "mm" : "in";

  const handleUnitChange = (newUnit: UnitSystem) => {
    if (newUnit === unit) return;
    const convert = newUnit === "imperial" ? mmToInches : inchesToMm;
    const round = (v: number) => newUnit === "imperial" ? Math.round(v * 100) / 100 : Math.round(v * 10) / 10;

    setSheetParts(prev => prev.map(p => ({
      ...p,
      length: p.length ? round(convert(p.length)) : 0,
      width: p.width ? round(convert(p.width)) : 0,
    })));
    setSheetStocks(prev => prev.map(s => ({
      ...s,
      length: s.length ? round(convert(s.length)) : 0,
      width: s.width ? round(convert(s.width)) : 0,
    })));
    setLinearParts(prev => prev.map(p => ({
      ...p,
      length: p.length ? round(convert(p.length)) : 0,
    })));
    setLinearStocks(prev => prev.map(s => ({
      ...s,
      length: s.length ? round(convert(s.length)) : 0,
    })));
    setKerf(kerf ? round(convert(kerf)) : 0);
    setSheetResults(null);
    setLinearResults(null);
    setStats(null);
    setUnit(newUnit);
  };

  const handleOptimize = useCallback(() => {
    setIsOptimizing(true);
    setTimeout(() => {
      if (mode === "sheet") {
        const result = optimizeSheetCut(sheetParts, sheetStocks, kerf, considerGrain);
        setSheetResults(result.sheets);
        setLinearResults(null);
        setStats(result.stats);
      } else {
        const result = optimizeLinearCut(linearParts, linearStocks, kerf);
        setLinearResults(result.results);
        setSheetResults(null);
        setStats(result.stats);
      }
      setIsOptimizing(false);
    }, 100);
  }, [mode, sheetParts, sheetStocks, linearParts, linearStocks, kerf, considerGrain]);

  const handleReset = () => {
    partCounter = 1;
    stockCounter = 1;
    setSheetParts([createPart()]);
    setSheetStocks([createStock()]);
    setLinearParts([createLinearPart()]);
    setLinearStocks([createLinearStock()]);
    setSheetResults(null);
    setLinearResults(null);
    setStats(null);
    setLoadedItemType(null);
  };

  const handleLoadCutList = async (filterType?: string) => {
    setIsLoadingCutList(true);
    setLoadPopoverOpen(false);
    try {
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const qs = params.toString();
      const resp = await fetch(`/api/cutting-list${qs ? `?${qs}` : ''}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ message: 'Failed to load' }));
        throw new Error(err.message);
      }
      const data = await resp.json();
      const rows = data.rows || [];

      if (rows.length === 0) {
        toast({ title: "No Data", description: "No uncompleted cutting list items found.", variant: "destructive" });
        setIsLoadingCutList(false);
        return;
      }

      const typeFilter = filterType || 'all';
      const filtered = typeFilter === 'all' ? rows : rows.filter((r: any) => r.ItemType === typeFilter);

      if (filtered.length === 0) {
        toast({ title: "No Data", description: `No ${typeFilter} items found in the cutting list.`, variant: "destructive" });
        setIsLoadingCutList(false);
        return;
      }

      const isMouldingOnly = filtered.every((r: any) => r.ItemType === 'Moulding');

      if (isMouldingOnly) {
        setMode('linear');
        partCounter = 1;
        const stockSet = new Map<number, LinearStock>();

        const codeGroups = new Map<string, { code: string; name: string; cuts: Map<number, number>; stockLen: number }>();

        for (const row of filtered) {
          const code = row.ItemCode || 'Unknown';
          const cutW = Number(row.CutWidth) || 0;
          const cutH = Number(row.CutHeight) || 0;
          const copies = Math.round(Number(row.UsedQuantity) || 1);

          const mouldingWidth = Number(row.MouldingWidth) || 0;
          const mouldingRebate = Number(row.MouldingRebate) || 0;
          const outsideAddon = 2 * (mouldingWidth - mouldingRebate);
          const outsideAddonMm = outsideAddon < 10 ? Math.round(outsideAddon * 1000) : outsideAddon;

          let group = codeGroups.get(code);
          if (!group) {
            group = { code, name: row.ItemName || code, cuts: new Map(), stockLen: 0 };
            codeGroups.set(code, group);
          }

          if (cutW > 0) {
            const insideMm = cutW < 10 ? Math.round(cutW * 1000) : cutW;
            const outsideMm = Math.round(insideMm + outsideAddonMm);
            const piecesNeeded = copies * 2;
            group.cuts.set(outsideMm, (group.cuts.get(outsideMm) || 0) + piecesNeeded);
          }
          if (cutH > 0) {
            const insideMm = cutH < 10 ? Math.round(cutH * 1000) : cutH;
            const outsideMm = Math.round(insideMm + outsideAddonMm);
            const piecesNeeded = copies * 2;
            group.cuts.set(outsideMm, (group.cuts.get(outsideMm) || 0) + piecesNeeded);
          }

          const stockLen = Number(row.StockLength) || 0;
          if (stockLen > 0) {
            const stockMm = stockLen < 10 ? Math.round(stockLen * 1000) : stockLen;
            group.stockLen = stockMm;
            if (!stockSet.has(stockMm)) {
              stockSet.set(stockMm, {
                id: String(stockCounter++),
                length: stockMm,
                quantity: 99,
              });
            }
          }
        }

        const parts: LinearPart[] = [];
        Array.from(codeGroups.entries()).forEach(([code, group]) => {
          Array.from(group.cuts.entries()).forEach(([lengthMm, qty]) => {
            parts.push({
              id: String(partCounter++),
              label: `${code}`,
              length: lengthMm,
              quantity: qty,
            });
          });
        });

        if (stockSet.size === 0) {
          stockSet.set(3000, { id: String(stockCounter++), length: 3000, quantity: 99 });
        }

        setLinearParts(parts.length > 0 ? parts : [createLinearPart()]);
        setLinearStocks(Array.from(stockSet.values()));
      } else {
        setMode('sheet');
        partCounter = 1;
        stockCounter = 1;
        const parts: CutPart[] = [];
        const stockSet = new Map<string, StockSheet>();

        for (const row of filtered) {
          if (row.ItemType === 'Moulding') continue;

          const cutW = Number(row.CutWidth) || 0;
          const cutH = Number(row.CutHeight) || 0;
          const qty = Number(row.UsedQuantity) || 1;

          if (cutW <= 0 || cutH <= 0) continue;

          const isMetres = cutW < 10 && cutH < 10;
          const widthMm = isMetres ? Math.round(cutW * 1000) : cutW;
          const heightMm = isMetres ? Math.round(cutH * 1000) : cutH;

          parts.push({
            id: String(partCounter++),
            label: `${row.ItemName || row.ItemCode} (${row.SaleNumber})`,
            length: widthMm,
            width: heightMm,
            quantity: qty,
          });

          const sheetW = Number(row.StockSheetWidth) || 0;
          const sheetH = Number(row.StockSheetHeight) || 0;
          if (sheetW > 0 && sheetH > 0) {
            const key = `${sheetW}x${sheetH}`;
            if (!stockSet.has(key)) {
              stockSet.set(key, {
                id: String(stockCounter++),
                length: sheetW,
                width: sheetH,
                quantity: 99,
              });
            }
          }
        }

        if (stockSet.size === 0) {
          stockSet.set('default', { id: String(stockCounter++), length: 1220, width: 820, quantity: 99 });
        }

        setSheetParts(parts.length > 0 ? parts : [createPart()]);
        setSheetStocks(Array.from(stockSet.values()));
      }

      setUnit('metric');
      setSheetResults(null);
      setLinearResults(null);
      setStats(null);
      setLoadedItemType(typeFilter);

      const typeCounts: Record<string, number> = {};
      for (const r of rows) {
        typeCounts[r.ItemType] = (typeCounts[r.ItemType] || 0) + 1;
      }
      const summary = Object.entries(typeCounts).map(([t, c]) => `${c} ${t}`).join(', ');

      toast({
        title: "Cutting List Loaded",
        description: `Loaded ${filtered.length} items (${summary} total). ${isMouldingOnly ? 'Set to Linear mode.' : 'Set to Sheet mode.'}`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to load cutting list", variant: "destructive" });
    } finally {
      setIsLoadingCutList(false);
    }
  };

  const updateSheetPart = (index: number, field: keyof CutPart, value: string | number) => {
    setSheetParts(prev => {
      const updated = [...prev];
      (updated[index] as any)[field] = field === "label" ? value : Number(value) || 0;
      return updated;
    });
  };

  const updateSheetStock = (index: number, field: keyof StockSheet, value: string | number) => {
    setSheetStocks(prev => {
      const updated = [...prev];
      (updated[index] as any)[field] = Number(value) || 0;
      return updated;
    });
  };

  const updateLinearPart = (index: number, field: keyof LinearPart, value: string | number) => {
    setLinearParts(prev => {
      const updated = [...prev];
      (updated[index] as any)[field] = field === "label" ? value : Number(value) || 0;
      return updated;
    });
  };

  const updateLinearStock = (index: number, field: keyof LinearStock, value: string | number) => {
    setLinearStocks(prev => {
      const updated = [...prev];
      (updated[index] as any)[field] = Number(value) || 0;
      return updated;
    });
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold" data-testid="text-page-title">Cut List Optimizer</h1>
          <p className="text-muted-foreground mt-1">Optimize material cutting to minimize waste</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={mode} onValueChange={(v) => setMode(v as CutMode)}>
            <SelectTrigger className="w-40" data-testid="select-cut-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sheet">Sheet Cut (2D)</SelectItem>
              <SelectItem value="linear">Linear Cut (1D)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={unit} onValueChange={(v) => handleUnitChange(v as UnitSystem)}>
            <SelectTrigger className="w-36" data-testid="select-unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="metric">Metric (mm)</SelectItem>
              <SelectItem value="imperial">Imperial (in)</SelectItem>
            </SelectContent>
          </Select>

          <Popover open={loadPopoverOpen} onOpenChange={setLoadPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" disabled={isLoadingCutList} data-testid="button-load-cutting-list">
                {isLoadingCutList ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading...</>
                ) : (
                  <><Download className="h-4 w-4 mr-2" />Load Cutting List</>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-3">
                <p className="text-sm font-medium">Load from Database</p>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Item Type</Label>
                  <Select value={loadItemType} onValueChange={setLoadItemType}>
                    <SelectTrigger data-testid="select-load-item-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="Moulding">Moulding Only</SelectItem>
                      <SelectItem value="Matboard">Matboard Only</SelectItem>
                      <SelectItem value="Backing">Backing Only</SelectItem>
                      <SelectItem value="Covering">Covering Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> Date Range (Order Created)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="text-xs"
                      data-testid="input-date-from"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="text-xs"
                      data-testid="input-date-to"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Leave blank for all dates</p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => handleLoadCutList(loadItemType)}
                  disabled={isLoadingCutList}
                  data-testid="button-load-confirm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Load Items
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button onClick={handleOptimize} disabled={isOptimizing} data-testid="button-optimize">
            <Play className="h-4 w-4 mr-2" />
            {isOptimizing ? "Optimizing..." : "Optimize"}
          </Button>
          <Button variant="outline" onClick={handleReset} data-testid="button-reset">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Scissors className="h-4 w-4" />
                {mode === "sheet" ? "Panels to Cut" : "Parts to Cut"}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => mode === "sheet"
                  ? setSheetParts(prev => [...prev, createPart()])
                  : setLinearParts(prev => [...prev, createLinearPart()])
                }
                data-testid="button-add-part"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {mode === "sheet" ? (
                sheetParts.map((part, idx) => (
                  <div key={part.id} className="flex items-end gap-2 p-3 rounded-lg border border-border" data-testid={`panel-part-${idx}`}>
                    <div className="w-3 h-3 rounded-sm shrink-0 mt-6" style={{ backgroundColor: getPartColor(idx) }} />
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Label"
                        value={part.label}
                        onChange={(e) => updateSheetPart(idx, "label", e.target.value)}
                        className="h-8 text-xs"
                        data-testid={`input-part-label-${idx}`}
                      />
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">L ({unitLabel})</Label>
                          <Input
                            type="number"
                            value={part.length || ""}
                            onChange={(e) => updateSheetPart(idx, "length", e.target.value)}
                            className="h-8 text-xs"
                            data-testid={`input-part-length-${idx}`}
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">W ({unitLabel})</Label>
                          <Input
                            type="number"
                            value={part.width || ""}
                            onChange={(e) => updateSheetPart(idx, "width", e.target.value)}
                            className="h-8 text-xs"
                            data-testid={`input-part-width-${idx}`}
                          />
                        </div>
                        <div className="w-16">
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <Input
                            type="number"
                            min={1}
                            value={part.quantity}
                            onChange={(e) => updateSheetPart(idx, "quantity", e.target.value)}
                            className="h-8 text-xs"
                            data-testid={`input-part-qty-${idx}`}
                          />
                        </div>
                      </div>
                    </div>
                    {sheetParts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSheetParts(prev => prev.filter((_, i) => i !== idx))}
                        className="shrink-0"
                        data-testid={`button-remove-part-${idx}`}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                linearParts.map((part, idx) => (
                  <div key={part.id} className="flex items-end gap-2 p-3 rounded-lg border border-border" data-testid={`panel-part-${idx}`}>
                    <div className="w-3 h-3 rounded-sm shrink-0 mt-6" style={{ backgroundColor: getPartColor(idx) }} />
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Label"
                        value={part.label}
                        onChange={(e) => updateLinearPart(idx, "label", e.target.value)}
                        className="h-8 text-xs"
                        data-testid={`input-part-label-${idx}`}
                      />
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Length ({unitLabel})</Label>
                          <Input
                            type="number"
                            value={part.length || ""}
                            onChange={(e) => updateLinearPart(idx, "length", e.target.value)}
                            className="h-8 text-xs"
                            data-testid={`input-part-length-${idx}`}
                          />
                        </div>
                        <div className="w-16">
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <Input
                            type="number"
                            min={1}
                            value={part.quantity}
                            onChange={(e) => updateLinearPart(idx, "quantity", e.target.value)}
                            className="h-8 text-xs"
                            data-testid={`input-part-qty-${idx}`}
                          />
                        </div>
                      </div>
                    </div>
                    {linearParts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setLinearParts(prev => prev.filter((_, i) => i !== idx))}
                        className="shrink-0"
                        data-testid={`button-remove-part-${idx}`}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                {mode === "sheet" ? "Stock Sheets" : "Stock Lengths"}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => mode === "sheet"
                  ? setSheetStocks(prev => [...prev, createStock()])
                  : setLinearStocks(prev => [...prev, createLinearStock()])
                }
                data-testid="button-add-stock"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {mode === "sheet" ? (
                sheetStocks.map((stock, idx) => (
                  <div key={stock.id} className="flex items-end gap-2 p-3 rounded-lg border border-border" data-testid={`panel-stock-${idx}`}>
                    <div className="flex-1">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">L ({unitLabel})</Label>
                          <Input
                            type="number"
                            value={stock.length || ""}
                            onChange={(e) => updateSheetStock(idx, "length", e.target.value)}
                            className="h-8 text-xs"
                            data-testid={`input-stock-length-${idx}`}
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">W ({unitLabel})</Label>
                          <Input
                            type="number"
                            value={stock.width || ""}
                            onChange={(e) => updateSheetStock(idx, "width", e.target.value)}
                            className="h-8 text-xs"
                            data-testid={`input-stock-width-${idx}`}
                          />
                        </div>
                        <div className="w-16">
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <Input
                            type="number"
                            min={1}
                            value={stock.quantity}
                            onChange={(e) => updateSheetStock(idx, "quantity", e.target.value)}
                            className="h-8 text-xs"
                            data-testid={`input-stock-qty-${idx}`}
                          />
                        </div>
                      </div>
                    </div>
                    {sheetStocks.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSheetStocks(prev => prev.filter((_, i) => i !== idx))}
                        className="shrink-0"
                        data-testid={`button-remove-stock-${idx}`}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                linearStocks.map((stock, idx) => (
                  <div key={stock.id} className="flex items-end gap-2 p-3 rounded-lg border border-border" data-testid={`panel-stock-${idx}`}>
                    <div className="flex-1">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Length ({unitLabel})</Label>
                          <Input
                            type="number"
                            value={stock.length || ""}
                            onChange={(e) => updateLinearStock(idx, "length", e.target.value)}
                            className="h-8 text-xs"
                            data-testid={`input-stock-length-${idx}`}
                          />
                        </div>
                        <div className="w-16">
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <Input
                            type="number"
                            min={1}
                            value={stock.quantity}
                            onChange={(e) => updateLinearStock(idx, "quantity", e.target.value)}
                            className="h-8 text-xs"
                            data-testid={`input-stock-qty-${idx}`}
                          />
                        </div>
                      </div>
                    </div>
                    {linearStocks.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setLinearStocks(prev => prev.filter((_, i) => i !== idx))}
                        className="shrink-0"
                        data-testid={`button-remove-stock-${idx}`}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Kerf / Blade Thickness ({unitLabel})</Label>
                <Input
                  type="number"
                  value={kerf}
                  onChange={(e) => setKerf(Number(e.target.value) || 0)}
                  className="h-8 text-xs"
                  data-testid="input-kerf"
                />
              </div>
              {mode === "sheet" && (
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Consider Grain Direction</Label>
                  <Switch
                    checked={considerGrain}
                    onCheckedChange={setConsiderGrain}
                    data-testid="switch-grain"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {stats && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Optimization Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Stock Used</p>
                    <p className="text-2xl font-bold" data-testid="stat-stock-used">{stats.totalStockUsed}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">
                      {mode === "sheet" ? "Used Area" : "Used Length"}
                    </p>
                    <p className="text-2xl font-bold" data-testid="stat-used-area">
                      {mode === "sheet"
                        ? `${stats.totalUsedArea.toLocaleString()} ${unitLabel}\u00B2`
                        : `${stats.totalUsedArea.toLocaleString()} ${unitLabel}`
                      }
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Waste</p>
                    <p className="text-2xl font-bold" data-testid="stat-waste">
                      {stats.totalWastePercent.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Total Cuts</p>
                    <p className="text-2xl font-bold" data-testid="stat-cuts">{stats.totalCuts}</p>
                  </div>
                </div>

                {stats.unfitParts.length > 0 && (
                  <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium text-destructive">Unable to Fit</span>
                    </div>
                    <div className="space-y-1">
                      {stats.unfitParts.map((p, i) => (
                        <div key={i} className="text-sm text-muted-foreground flex justify-between">
                          <span>{p.label}</span>
                          <span>x{p.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {mode === "sheet" && sheetResults && sheetResults.map((sheet, sheetIdx) => (
            <Card key={sheetIdx}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm">
                  Sheet {sheetIdx + 1} ({sheet.stockLength} x {sheet.stockWidth} {unitLabel})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {sheet.placements.length} panels
                  </Badge>
                  <Badge variant={sheet.wastePercent < 20 ? "default" : "secondary"} className="text-xs">
                    {sheet.wastePercent.toFixed(1)}% waste
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <SheetDiagram sheet={sheet} unit={unitLabel} sheetParts={sheetParts} />
              </CardContent>
            </Card>
          ))}

          {mode === "linear" && linearResults && linearResults.map((result, resultIdx) => (
            <Card key={resultIdx}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm">
                  Stock {resultIdx + 1} ({result.stockLength} {unitLabel})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {result.placements.length} parts
                  </Badge>
                  <Badge variant={result.wastePercent < 20 ? "default" : "secondary"} className="text-xs">
                    {result.wastePercent.toFixed(1)}% waste
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <LinearDiagram result={result} unit={unitLabel} linearParts={linearParts} />
              </CardContent>
            </Card>
          ))}

          {!stats && (
            <Card>
              <CardContent className="py-16 text-center">
                <Scissors className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Ready to Optimize</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add your panels and stock {mode === "sheet" ? "sheets" : "lengths"}, then click Optimize
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function SheetDiagram({ sheet, unit, sheetParts }: { sheet: SheetResult; unit: string; sheetParts: CutPart[] }) {
  const maxWidth = 700;
  const padding = 2;
  const scale = Math.min(maxWidth / sheet.stockLength, 400 / sheet.stockWidth);
  const svgWidth = sheet.stockLength * scale + padding * 2;
  const svgHeight = sheet.stockWidth * scale + padding * 2;

  const partIndexMap = new Map<string, number>();
  sheetParts.forEach((p, i) => partIndexMap.set(p.id, i));

  return (
    <div className="overflow-x-auto">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="border border-border rounded"
        data-testid="sheet-diagram"
      >
        <rect
          x={padding}
          y={padding}
          width={sheet.stockLength * scale}
          height={sheet.stockWidth * scale}
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth={1}
        />

        {sheet.placements.map((p, i) => {
          const colorIdx = partIndexMap.get(p.partId) ?? i;
          const color = getPartColor(colorIdx);
          const x = padding + p.x * scale;
          const y = padding + p.y * scale;
          const w = p.length * scale;
          const h = p.width * scale;
          const fontSize = Math.min(w, h) * 0.2;
          const showLabel = fontSize > 6;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill={color}
                fillOpacity={0.8}
                stroke="white"
                strokeWidth={1}
              />
              {showLabel && (
                <>
                  <text
                    x={x + w / 2}
                    y={y + h / 2 - (fontSize > 8 ? fontSize * 0.4 : 0)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize={Math.min(fontSize, 14)}
                    fontWeight="bold"
                  >
                    {p.label}
                  </text>
                  {fontSize > 8 && (
                    <text
                      x={x + w / 2}
                      y={y + h / 2 + fontSize * 0.6}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="white"
                      fontSize={Math.min(fontSize * 0.7, 10)}
                      fillOpacity={0.8}
                    >
                      {p.length}x{p.width}
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}

        <text x={svgWidth / 2} y={svgHeight - 2} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={10}>
          {sheet.stockLength} {unit}
        </text>
        <text
          x={4}
          y={svgHeight / 2}
          textAnchor="middle"
          fill="hsl(var(--muted-foreground))"
          fontSize={10}
          transform={`rotate(-90, 4, ${svgHeight / 2})`}
        >
          {sheet.stockWidth} {unit}
        </text>
      </svg>
    </div>
  );
}

function LinearDiagram({ result, unit, linearParts }: { result: LinearResult; unit: string; linearParts: LinearPart[] }) {
  const maxWidth = 700;
  const barHeight = 50;
  const padding = 2;
  const scale = maxWidth / result.stockLength;

  const partIndexMap = new Map<string, number>();
  linearParts.forEach((p, i) => partIndexMap.set(p.id, i));

  return (
    <div className="overflow-x-auto">
      <svg
        width={maxWidth + padding * 2}
        height={barHeight + 30 + padding * 2}
        className="border border-border rounded"
        data-testid="linear-diagram"
      >
        <rect
          x={padding}
          y={padding}
          width={result.stockLength * scale}
          height={barHeight}
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth={1}
        />

        {result.placements.map((p, i) => {
          const colorIdx = partIndexMap.get(p.partId) ?? i;
          const color = getPartColor(colorIdx);
          const x = padding + p.start * scale;
          const w = p.length * scale;
          const fontSize = Math.min(w * 0.15, 12);
          const showLabel = fontSize > 5;

          return (
            <g key={i}>
              <rect
                x={x}
                y={padding}
                width={w}
                height={barHeight}
                fill={color}
                fillOpacity={0.8}
                stroke="white"
                strokeWidth={1}
              />
              {showLabel && (
                <>
                  <text
                    x={x + w / 2}
                    y={padding + barHeight / 2 - 6}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize={fontSize}
                    fontWeight="bold"
                  >
                    {p.label}
                  </text>
                  <text
                    x={x + w / 2}
                    y={padding + barHeight / 2 + 8}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize={fontSize * 0.8}
                    fillOpacity={0.8}
                  >
                    {p.length} {unit}
                  </text>
                </>
              )}
            </g>
          );
        })}

        <text
          x={padding + result.stockLength * scale / 2}
          y={barHeight + padding + 18}
          textAnchor="middle"
          fill="hsl(var(--muted-foreground))"
          fontSize={10}
        >
          {result.stockLength} {unit}
        </text>
      </svg>
    </div>
  );
}
