"use client";

import * as React from "react";

import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/lib/utils";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

/**
 * Responsive DataTable. Desktop: shadcn Table.
 * Mobile: stacked Card list with column headers as inline labels.
 */

export interface ResponsiveDataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  hideOnMobile?: boolean;
  hideMobileLabel?: boolean;
}

export interface ResponsiveDataTableProps<T> {
  data: ReadonlyArray<T>;
  columns: ReadonlyArray<ResponsiveDataTableColumn<T>>;
  getRowKey: (row: T, index: number) => string | number;
  onRowClick?: (row: T, index: number) => void;
  mobileCard?: (row: T, index: number) => React.ReactNode;
  empty?: React.ReactNode;
  caption?: React.ReactNode;
  className?: string;
  mobileCardClassName?: string;
}

export function ResponsiveDataTable<T>({
  data,
  columns,
  getRowKey,
  onRowClick,
  mobileCard,
  empty,
  caption,
  className,
  mobileCardClassName,
}: ResponsiveDataTableProps<T>) {
  const isMobile = useIsMobile();

  if (data.length === 0 && empty) {
    return <div className={className}>{empty}</div>;
  }

  if (isMobile) {
    return (
      <div className={cn("space-y-3", className)}>
        {data.map((row, i) => {
          const key = getRowKey(row, i);
          if (mobileCard) {
            return (
              <React.Fragment key={key}>{mobileCard(row, i)}</React.Fragment>
            );
          }
          const visibleCols = columns.filter((c) => !c.hideOnMobile);
          const clickable = Boolean(onRowClick);
          return (
            <div
              key={key}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => onRowClick?.(row, i) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick?.(row, i);
                      }
                    }
                  : undefined
              }
              className={cn(
                "rounded-lg border border-border bg-card p-3 shadow-sm",
                clickable &&
                  "cursor-pointer transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                mobileCardClassName,
              )}
            >
              <dl className="space-y-1.5 text-sm">
                {visibleCols.map((col) => (
                  <div
                    key={col.id}
                    className="flex items-start justify-between gap-3"
                  >
                    {!col.hideMobileLabel && (
                      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {col.header}
                      </dt>
                    )}
                    <dd
                      className={cn(
                        "min-w-0 flex-1 text-right text-foreground",
                        col.hideMobileLabel && "text-left",
                        col.className,
                      )}
                    >
                      {col.cell(row, i)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Table className={className}>
      {caption && <TableCaption>{caption}</TableCaption>}
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.id} className={col.headerClassName}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, i) => {
          const key = getRowKey(row, i);
          const clickable = Boolean(onRowClick);
          return (
            <TableRow
              key={key}
              data-clickable={clickable || undefined}
              onClick={clickable ? () => onRowClick?.(row, i) : undefined}
              className={cn(clickable && "cursor-pointer")}
            >
              {columns.map((col) => (
                <TableCell key={col.id} className={col.className}>
                  {col.cell(row, i)}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
