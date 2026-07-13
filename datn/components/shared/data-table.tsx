"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorState, LoadingState } from "./states";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  headClassName?: string;
  width?: string;
  sortable?: boolean;
  sortAccessor?: (row: T) => string | number | null | undefined;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string | number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
  stickyHeader?: boolean;
}

const alignClass = { left: "text-left", right: "text-right", center: "text-center" } as const;

export function DataTable<T>({
  columns, rows, getRowId, loading, error, onRetry, empty, onRowClick, className, stickyHeader = true,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const accessor = col.sortAccessor ?? (() => null);
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv), "vi");
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort, columns]);

  function toggleSort(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  const body = (() => {
    if (loading) return <LoadingState />;
    if (error) return <ErrorState message={error} onRetry={onRetry} />;
    if (rows.length === 0) return empty ?? <EmptyState />;
    return null;
  })();

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className={cn(stickyHeader && "sticky top-0 z-10")}>
            <TableRow className="border-border bg-muted/50 hover:bg-muted/50">
              {columns.map((col) => {
                const active = sort?.key === col.key;
                return (
                  <TableHead
                    key={col.key}
                    style={col.width ? { width: col.width } : undefined}
                    className={cn(
                      "h-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      col.align && alignClass[col.align],
                      col.sortable && "cursor-pointer select-none hover:text-foreground",
                      col.headClassName,
                    )}
                    onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  >
                    <span className={cn("inline-flex items-center gap-1", col.align === "right" && "flex-row-reverse")}>
                      {col.header}
                      {col.sortable && (
                        active ? (
                          sort!.dir === "asc" ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />
                        ) : (
                          <ChevronsUpDown className="size-3.5 opacity-40" />
                        )
                      )}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          {!body && (
            <TableBody>
              {sortedRows.map((row) => (
                <TableRow
                  key={getRowId(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn("border-border", onRowClick && "cursor-pointer")}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn("py-2.5 text-sm text-foreground", col.align && alignClass[col.align], col.className)}
                    >
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>
      </div>
      {body && <div className="border-t border-border">{body}</div>}
    </div>
  );
}
