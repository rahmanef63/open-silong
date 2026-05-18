"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, X, Database as DatabaseIcon, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import type { SimpleTableBlockProps } from "../types";

const DEFAULT_ROWS: string[][] = [["", "", ""], ["", "", ""], ["", "", ""]];

interface Cell { r: number; c: number; }

export function SimpleTableBlock({ block, onUpdate, onReplace }: SimpleTableBlockProps) {
  const { addDatabaseFromTable } = useStore();
  const rows = useMemo<string[][]>(
    () => (block.tableRows && block.tableRows.length ? block.tableRows : DEFAULT_ROWS),
    [block.tableRows],
  );
  const cols = rows[0]?.length ?? 0;
  const hasHeader = block.tableHeader !== false;

  const [active, setActive] = useState<Cell | null>(null);
  const [fillSource, setFillSource] = useState<Cell | null>(null);
  const [fillTarget, setFillTarget] = useState<Cell | null>(null);
  const fillSourceRef = useRef<Cell | null>(null);
  const fillTargetRef = useRef<Cell | null>(null);
  fillSourceRef.current = fillSource;
  fillTargetRef.current = fillTarget;
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const set = (next: string[][]) => onUpdate({ tableRows: next });

  const setCell = (r: number, c: number, v: string) => {
    const next = rows.map((row) => [...row]);
    next[r][c] = v;
    set(next);
  };

  const addRow = () => set([...rows.map((r) => [...r]), Array(cols).fill("")]);
  const addCol = () => set(rows.map((r) => [...r, ""]));
  const delRow = (i: number) => {
    if (rows.length <= 1) return;
    set(rows.filter((_, idx) => idx !== i));
  };
  const delCol = (i: number) => {
    if (cols <= 1) return;
    set(rows.map((r) => r.filter((_, idx) => idx !== i)));
  };

  // ─── Drag-fill (Excel-style) ──────────────────────────────────
  // mousedown on fill handle → set fillSource; mousemove tracks
  // target cell via elementFromPoint; mouseup commits the fill.
  useEffect(() => {
    if (!fillSource) return;
    const onMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cellEl = el?.closest<HTMLElement>("[data-tbl-cell]");
      if (!cellEl) return;
      const r = Number(cellEl.dataset.r);
      const c = Number(cellEl.dataset.c);
      if (!Number.isFinite(r) || !Number.isFinite(c)) return;
      if (c !== fillSource.c) return; // restrict fill to source column
      setFillTarget({ r, c });
    };
    const onUp = () => {
      const src = fillSourceRef.current;
      const tgt = fillTargetRef.current;
      if (src && tgt && src.c === tgt.c && src.r !== tgt.r) {
        const value = rowsRef.current[src.r]?.[src.c] ?? "";
        const lo = Math.min(src.r, tgt.r);
        const hi = Math.max(src.r, tgt.r);
        const next = rowsRef.current.map((row) => [...row]);
        for (let r = lo; r <= hi; r++) next[r][src.c] = value;
        set(next);
      }
      setFillSource(null);
      setFillTarget(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillSource]);

  const isInFillRange = (r: number, c: number): boolean => {
    if (!fillSource || !fillTarget) return false;
    if (c !== fillSource.c) return false;
    const lo = Math.min(fillSource.r, fillTarget.r);
    const hi = Math.max(fillSource.r, fillTarget.r);
    return r >= lo && r <= hi;
  };

  const turnIntoDatabase = async () => {
    if (!onReplace) {
      toast.error("Cannot convert here — open this block at top level");
      return;
    }
    const dbId = await addDatabaseFromTable({
      headerRow: hasHeader ? rows[0] : Array(cols).fill("").map((_, i) => `Column ${i + 1}`),
      bodyRows: hasHeader ? rows.slice(1) : rows,
    });
    if (!dbId) { toast.error("Convert failed — no database id"); return; }
    onReplace({
      ...block,
      type: "database",
      tableRows: undefined,
      tableHeader: undefined,
      databaseId: dbId,
      text: "",
    });
    toast.success("Converted table to database");
  };

  return (
    <div className="my-2 rounded border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-2 py-1">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>{rows.length} × {cols}</span>
          <label className="inline-flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={hasHeader}
              onChange={(e) => onUpdate({ tableHeader: e.target.checked })}
              className="h-3 w-3"
            />
            Header row
          </label>
        </div>
        {onReplace && (
          <Button
            type="button"
            variant="outline"
            onClick={turnIntoDatabase}
            className="h-auto gap-1 px-2 py-0.5 text-[11px] font-normal [&_svg]:size-3"
            title="Convert to a real database with views, filters, and properties"
          >
            <DatabaseIcon className="h-3 w-3" /> Turn into database
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <colgroup>
            <col className="w-8" />
            {Array.from({ length: cols }).map((_, c) => <col key={c} />)}
            <col className="w-8" />
          </colgroup>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="group/row">
                <td className="bg-muted/20 text-center align-middle border border-border w-8">
                  <Button
                    type="button" variant="ghost" size="icon"
                    onClick={() => delRow(r)}
                    title="Delete row"
                    aria-label="Delete row"
                    className="h-auto w-auto p-0.5 opacity-0 group-hover/row:opacity-60 hover:!opacity-100 hover:text-destructive hover:bg-transparent [&_svg]:size-3"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
                {row.map((cell, c) => {
                  const isActive = active?.r === r && active?.c === c;
                  const inFill = isInFillRange(r, c);
                  return (
                    <td
                      key={c}
                      data-tbl-cell
                      data-r={r}
                      data-c={c}
                      className={cn(
                        "border border-border align-top relative",
                        hasHeader && r === 0 && "bg-muted/50 font-medium",
                        isActive && "ring-2 ring-brand ring-inset",
                        inFill && "bg-brand/10",
                      )}
                    >
                      <input
                        value={cell}
                        onChange={(e) => setCell(r, c, e.target.value)}
                        onFocus={() => setActive({ r, c })}
                        onBlur={() => setActive((cur) => cur?.r === r && cur?.c === c ? null : cur)}
                        placeholder={hasHeader && r === 0 ? `Col ${c + 1}` : ""}
                        className="w-full bg-transparent px-2 py-1 outline-none text-sm"
                      />
                      {isActive && rows.length > 1 && (
                        <div
                          role="button"
                          aria-label="Drag to fill column"
                          title="Drag down to fill cells"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setFillSource({ r, c });
                            setFillTarget({ r, c });
                          }}
                          className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-sm bg-brand border border-background cursor-crosshair"
                        />
                      )}
                    </td>
                  );
                })}
                <td className="bg-muted/20 text-center align-middle border border-border w-8">
                  {r === 0 && (
                    <span className="inline-flex items-center justify-center text-muted-foreground/40">
                      <GripVertical className="h-3 w-3" />
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {/* Column delete row — always visible at top via separate row */}
            <tr>
              <td className="bg-muted/20 border border-border" />
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="border border-border text-center bg-muted/10 p-0">
                  <Button
                    type="button" variant="ghost" size="icon"
                    onClick={() => delCol(c)}
                    title={`Delete column ${c + 1}`}
                    aria-label={`Delete column ${c + 1}`}
                    className="h-5 w-full rounded-none p-0 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 [&_svg]:size-3"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </td>
              ))}
              <td className="bg-muted/20 border border-border" />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex border-t border-border">
        <Button
          type="button" variant="ghost" onClick={addRow}
          className="flex-1 h-auto gap-1 py-1 text-[11px] font-normal text-muted-foreground rounded-none [&_svg]:size-3"
        >
          <Plus className="h-3 w-3" /> Add row
        </Button>
        <Button
          type="button" variant="ghost" onClick={addCol}
          className="flex-1 h-auto gap-1 border-l border-border py-1 text-[11px] font-normal text-muted-foreground rounded-none [&_svg]:size-3"
        >
          <Plus className="h-3 w-3" /> Add column
        </Button>
      </div>
    </div>
  );
}
