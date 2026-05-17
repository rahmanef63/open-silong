import { useMemo } from "react";
import { Plus, Trash2, X, Database as DatabaseIcon } from "lucide-react";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";
import type { SimpleTableBlockProps } from "../types";

const DEFAULT_ROWS: string[][] = [["", "", ""], ["", "", ""], ["", "", ""]];

export function SimpleTableBlock({ block, onUpdate, onReplace }: SimpleTableBlockProps) {
  const { addDatabaseFromTable } = useStore();
  const rows = useMemo<string[][]>(
    () => (block.tableRows && block.tableRows.length ? block.tableRows : DEFAULT_ROWS),
    [block.tableRows],
  );
  const cols = rows[0]?.length ?? 0;
  const hasHeader = block.tableHeader !== false;

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

  const turnIntoDatabase = async () => {
    if (!onReplace) {
      toast.error("Cannot convert here — open this block at top level");
      return;
    }
    const dbId = await addDatabaseFromTable({
      headerRow: hasHeader ? rows[0] : Array(cols).fill("").map((_, i) => `Column ${i + 1}`),
      bodyRows: hasHeader ? rows.slice(1) : rows,
    });
    if (!dbId) return;
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
    <div className="my-2 rounded border border-border overflow-x-auto">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-2 py-1">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
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
      <table className="w-full text-sm border-collapse">
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="group/row">
              {row.map((cell, c) => (
                <td
                  key={c}
                  className={cn(
                    "border border-border align-top relative group/cell",
                    hasHeader && r === 0 && "bg-muted/50 font-medium",
                  )}
                >
                  <input
                    value={cell}
                    onChange={(e) => setCell(r, c, e.target.value)}
                    placeholder={hasHeader && r === 0 ? `Col ${c + 1}` : ""}
                    className="w-full bg-transparent px-2 py-1 outline-none text-sm"
                  />
                  {r === 0 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      onClick={() => delCol(c)}
                      className="absolute -top-2 right-0 hidden group-hover/cell:flex h-4 w-4 p-0 rounded-full [&_svg]:size-2.5"
                      aria-label="Delete column"
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  )}
                </td>
              ))}
              <td className="w-6 border-l border-border align-middle text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => delRow(r)}
                  className="h-auto w-auto p-0 opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-destructive hover:bg-transparent [&_svg]:size-3"
                  aria-label="Delete row"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex border-t border-border">
        <Button
          type="button"
          variant="ghost"
          onClick={addRow}
          className="flex-1 h-auto gap-1 py-1 text-[11px] font-normal text-muted-foreground rounded-none [&_svg]:size-3"
        >
          <Plus className="h-3 w-3" /> Add row
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={addCol}
          className="flex-1 h-auto gap-1 border-l border-border py-1 text-[11px] font-normal text-muted-foreground rounded-none [&_svg]:size-3"
        >
          <Plus className="h-3 w-3" /> Add column
        </Button>
      </div>
    </div>
  );
}
