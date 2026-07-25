import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface ResultsTableProps {
  columns: string[];
  data: any[];
  isLoading?: boolean;
}

export function ResultsTable({ columns, data, isLoading }: ResultsTableProps) {
  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-3" />
        Executing query...
      </div>
    );
  }

  if (!data.length && columns.length > 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border rounded-xl bg-muted/5">
        <span className="font-medium">No results returned</span>
        <span className="text-sm">Query executed successfully but matched 0 rows.</span>
      </div>
    );
  }

  if (!columns.length) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border rounded-xl bg-muted/5">
        <span className="font-medium">Ready to run</span>
        <span className="text-sm">Execute a query to see results here.</span>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full w-full rounded-xl border bg-card shadow-sm">
      <div className="min-w-max">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0">
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col} className="font-semibold text-foreground whitespace-nowrap px-6 py-3 h-10">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={i} className="hover:bg-muted/30 transition-colors">
                {columns.map((col) => (
                  <TableCell key={`${i}-${col}`} className="px-6 py-3 whitespace-nowrap font-mono text-xs">
                    {row[col] === null ? <span className="text-muted-foreground italic">null</span> : String(row[col])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
