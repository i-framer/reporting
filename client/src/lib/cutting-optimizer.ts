export interface CutPart {
  id: string;
  label: string;
  length: number;
  width: number;
  quantity: number;
}

export interface StockSheet {
  id: string;
  length: number;
  width: number;
  quantity: number;
}

export interface PlacedPart {
  partId: string;
  label: string;
  x: number;
  y: number;
  length: number;
  width: number;
  rotated: boolean;
}

export interface SheetResult {
  stockIndex: number;
  stockLength: number;
  stockWidth: number;
  placements: PlacedPart[];
  usedArea: number;
  totalArea: number;
  wastePercent: number;
  cuts: CutInstruction[];
}

export interface CutInstruction {
  index: number;
  panel: string;
  cutType: "horizontal" | "vertical";
  position: number;
  length: number;
}

export interface LinearPart {
  id: string;
  label: string;
  length: number;
  quantity: number;
}

export interface LinearStock {
  id: string;
  length: number;
  quantity: number;
}

export interface LinearPlacement {
  partId: string;
  label: string;
  start: number;
  length: number;
}

export interface LinearResult {
  stockIndex: number;
  stockLength: number;
  placements: LinearPlacement[];
  usedLength: number;
  wasteLength: number;
  wastePercent: number;
}

export interface OptimizationStats {
  totalStockUsed: number;
  totalUsedArea: number;
  totalWasteArea: number;
  totalWastePercent: number;
  totalCuts: number;
  totalCutLength: number;
  unfitParts: { label: string; quantity: number }[];
}

export function optimizeSheetCut(
  parts: CutPart[],
  stocks: StockSheet[],
  kerf: number = 0,
  considerGrain: boolean = false
): { sheets: SheetResult[]; stats: OptimizationStats } {
  const expandedParts: { id: string; label: string; length: number; width: number }[] = [];
  for (const part of parts) {
    if (part.length <= 0 || part.width <= 0) continue;
    for (let i = 0; i < part.quantity; i++) {
      expandedParts.push({
        id: part.id,
        label: part.label || `Part ${part.id}`,
        length: part.length,
        width: part.width,
      });
    }
  }

  expandedParts.sort((a, b) => {
    const areaA = a.length * a.width;
    const areaB = b.length * b.width;
    if (areaB !== areaA) return areaB - areaA;
    return Math.max(b.length, b.width) - Math.max(a.length, a.width);
  });

  const expandedStocks: { length: number; width: number }[] = [];
  for (const stock of stocks) {
    if (stock.length <= 0 || stock.width <= 0) continue;
    for (let i = 0; i < stock.quantity; i++) {
      expandedStocks.push({ length: stock.length, width: stock.width });
    }
  }

  const sheets: SheetResult[] = [];
  const unfitParts: { label: string; quantity: number }[] = [];
  const remaining = [...expandedParts];

  let stockIdx = 0;
  const maxSheets = expandedStocks.length > 0 ? expandedStocks.length : 50;

  while (remaining.length > 0 && stockIdx < maxSheets) {
    const stock = expandedStocks[stockIdx % expandedStocks.length] || expandedStocks[0];
    if (!stock) break;

    const freeRects: { x: number; y: number; w: number; h: number }[] = [
      { x: 0, y: 0, w: stock.length, h: stock.width }
    ];
    const placements: PlacedPart[] = [];
    const toRemove: number[] = [];

    for (let i = 0; i < remaining.length; i++) {
      const part = remaining[i];
      const placed = tryPlacePart(part, freeRects, kerf, considerGrain);
      if (placed) {
        placements.push(placed);
        toRemove.push(i);
      }
    }

    if (placements.length === 0) {
      const tooLarge: number[] = [];
      for (let i = 0; i < remaining.length; i++) {
        const r = remaining[i];
        const fitsAnyStock = expandedStocks.some(s =>
          (r.length <= s.length && r.width <= s.width) ||
          (!considerGrain && r.width <= s.length && r.length <= s.width)
        );
        if (!fitsAnyStock) {
          const existing = unfitParts.find(u => u.label === r.label);
          if (existing) existing.quantity++;
          else unfitParts.push({ label: r.label, quantity: 1 });
          tooLarge.push(i);
        }
      }
      for (let i = tooLarge.length - 1; i >= 0; i--) {
        remaining.splice(tooLarge[i], 1);
      }
      if (tooLarge.length === 0) break;
      continue;
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      remaining.splice(toRemove[i], 1);
    }

    const usedArea = placements.reduce((sum, p) => sum + p.length * p.width, 0);
    const totalArea = stock.length * stock.width;
    const cuts = generateCutInstructions(placements, stock.length, stock.width);

    sheets.push({
      stockIndex: stockIdx,
      stockLength: stock.length,
      stockWidth: stock.width,
      placements,
      usedArea,
      totalArea,
      wastePercent: totalArea > 0 ? ((totalArea - usedArea) / totalArea) * 100 : 0,
      cuts,
    });

    stockIdx++;
    if (stockIdx >= expandedStocks.length && remaining.length > 0) {
      expandedStocks.push({ ...stock });
    }
  }

  const totalUsedArea = sheets.reduce((s, sh) => s + sh.usedArea, 0);
  const totalArea = sheets.reduce((s, sh) => s + sh.totalArea, 0);

  return {
    sheets,
    stats: {
      totalStockUsed: sheets.length,
      totalUsedArea,
      totalWasteArea: totalArea - totalUsedArea,
      totalWastePercent: totalArea > 0 ? ((totalArea - totalUsedArea) / totalArea) * 100 : 0,
      totalCuts: sheets.reduce((s, sh) => s + sh.cuts.length, 0),
      totalCutLength: sheets.reduce((s, sh) => s + sh.cuts.reduce((cs, c) => cs + c.length, 0), 0),
      unfitParts,
    },
  };
}

function tryPlacePart(
  part: { id: string; label: string; length: number; width: number },
  freeRects: { x: number; y: number; w: number; h: number }[],
  kerf: number,
  considerGrain: boolean
): PlacedPart | null {
  let bestRect = -1;
  let bestRotated = false;
  let bestScore = Infinity;

  for (let i = 0; i < freeRects.length; i++) {
    const rect = freeRects[i];

    if (part.length + kerf <= rect.w && part.width + kerf <= rect.h) {
      const score = Math.min(rect.w - part.length, rect.h - part.width);
      if (score < bestScore) {
        bestScore = score;
        bestRect = i;
        bestRotated = false;
      }
    }

    if (!considerGrain && part.width + kerf <= rect.w && part.length + kerf <= rect.h) {
      const score = Math.min(rect.w - part.width, rect.h - part.length);
      if (score < bestScore) {
        bestScore = score;
        bestRect = i;
        bestRotated = true;
      }
    }
  }

  if (bestRect === -1) return null;

  const rect = freeRects[bestRect];
  const pLen = bestRotated ? part.width : part.length;
  const pWid = bestRotated ? part.length : part.width;

  const placement: PlacedPart = {
    partId: part.id,
    label: part.label,
    x: rect.x,
    y: rect.y,
    length: pLen,
    width: pWid,
    rotated: bestRotated,
  };

  freeRects.splice(bestRect, 1);

  const rightW = rect.w - pLen - kerf;
  const bottomH = rect.h - pWid - kerf;

  if (rightW > 0 && rect.h > 0) {
    freeRects.push({
      x: rect.x + pLen + kerf,
      y: rect.y,
      w: rightW,
      h: rect.h,
    });
  }

  if (bottomH > 0 && pLen > 0) {
    freeRects.push({
      x: rect.x,
      y: rect.y + pWid + kerf,
      w: pLen,
      h: bottomH,
    });
  }

  return placement;
}

function generateCutInstructions(
  placements: PlacedPart[],
  _stockLength: number,
  _stockWidth: number
): CutInstruction[] {
  const cuts: CutInstruction[] = [];
  let idx = 1;
  for (const p of placements) {
    cuts.push({
      index: idx++,
      panel: p.label,
      cutType: "vertical",
      position: p.x + p.length,
      length: p.width,
    });
    cuts.push({
      index: idx++,
      panel: p.label,
      cutType: "horizontal",
      position: p.y + p.width,
      length: p.length,
    });
  }
  return cuts;
}

export function optimizeLinearCut(
  parts: LinearPart[],
  stocks: LinearStock[],
  kerf: number = 0
): { results: LinearResult[]; stats: OptimizationStats } {
  const expandedParts: { id: string; label: string; length: number }[] = [];
  for (const part of parts) {
    if (part.length <= 0) continue;
    for (let i = 0; i < part.quantity; i++) {
      expandedParts.push({
        id: part.id,
        label: part.label || `Part ${part.id}`,
        length: part.length,
      });
    }
  }

  expandedParts.sort((a, b) => b.length - a.length);

  const expandedStocks: { length: number }[] = [];
  for (const stock of stocks) {
    if (stock.length <= 0) continue;
    for (let i = 0; i < stock.quantity; i++) {
      expandedStocks.push({ length: stock.length });
    }
  }

  const results: LinearResult[] = [];
  const unfitParts: { label: string; quantity: number }[] = [];
  const remaining = [...expandedParts];

  let stockIdx = 0;

  while (remaining.length > 0) {
    const stock = expandedStocks[stockIdx % Math.max(expandedStocks.length, 1)] || expandedStocks[0];
    if (!stock) break;

    let currentPos = 0;
    const placements: LinearPlacement[] = [];
    const toRemove: number[] = [];

    for (let i = 0; i < remaining.length; i++) {
      const part = remaining[i];
      const neededLength = currentPos === 0 ? part.length : part.length + kerf;
      if (currentPos + neededLength <= stock.length) {
        const start = currentPos === 0 ? 0 : currentPos + kerf;
        placements.push({
          partId: part.id,
          label: part.label,
          start,
          length: part.length,
        });
        currentPos = start + part.length;
        toRemove.push(i);
      }
    }

    if (placements.length === 0) {
      for (const r of remaining) {
        if (r.length > stock.length) {
          const existing = unfitParts.find(u => u.label === r.label);
          if (existing) existing.quantity++;
          else unfitParts.push({ label: r.label, quantity: 1 });
        }
      }
      const unfitLabels = new Set(unfitParts.map(u => u.label));
      const beforeLen = remaining.length;
      for (let i = remaining.length - 1; i >= 0; i--) {
        if (remaining[i].length > stock.length) remaining.splice(i, 1);
      }
      if (remaining.length === beforeLen) break;
      continue;
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      remaining.splice(toRemove[i], 1);
    }

    const usedLength = placements.reduce((s, p) => s + p.length, 0);
    const kerfConsumed = Math.max(0, placements.length - 1) * kerf;

    const effectiveUsed = usedLength + kerfConsumed;
    results.push({
      stockIndex: stockIdx,
      stockLength: stock.length,
      placements,
      usedLength,
      wasteLength: stock.length - effectiveUsed,
      wastePercent: stock.length > 0 ? ((stock.length - effectiveUsed) / stock.length) * 100 : 0,
    });

    stockIdx++;
    if (stockIdx >= expandedStocks.length && remaining.length > 0) {
      expandedStocks.push({ ...stock });
    }
  }

  const totalUsed = results.reduce((s, r) => s + r.usedLength, 0);
  const totalStock = results.reduce((s, r) => s + r.stockLength, 0);

  return {
    results,
    stats: {
      totalStockUsed: results.length,
      totalUsedArea: totalUsed,
      totalWasteArea: totalStock - totalUsed,
      totalWastePercent: totalStock > 0 ? ((totalStock - totalUsed) / totalStock) * 100 : 0,
      totalCuts: results.reduce((s, r) => s + r.placements.length, 0),
      totalCutLength: totalUsed,
      unfitParts,
    },
  };
}

export function mmToInches(mm: number): number {
  return mm / 25.4;
}

export function inchesToMm(inches: number): number {
  return inches * 25.4;
}

export function formatDimension(value: number, unit: "mm" | "inches"): string {
  if (unit === "inches") {
    return `${value.toFixed(2)}"`;
  }
  return `${value.toFixed(1)}mm`;
}

const PART_COLORS = [
  "#4F86C6", "#E07A5F", "#81B29A", "#F2CC8F", "#9B72AA",
  "#6AACB8", "#D97B5B", "#A8D5BA", "#F4A261", "#C175A0",
  "#5B8C8A", "#E8985E", "#7FB685", "#DDA15E", "#B084CC",
  "#4E9EAF", "#D4754E", "#93C9A7", "#E9C46A", "#A377B5",
];

export function getPartColor(index: number): string {
  return PART_COLORS[index % PART_COLORS.length];
}
