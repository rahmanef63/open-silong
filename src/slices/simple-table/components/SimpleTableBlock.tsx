import { useMemo } from "react";
import { Plus, Trash2, X, Database as DatabaseIcon } from "lucide-react";
import type { Block } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/shared/lib/utils";
import { toast } from "sonner";

interface Props {
  pageId: string;
  block: Block;
}

const DEFAULT_ROWS: string[][] = [["", "", ""], ["", "", ""], ["", "", ""]];

export function SimpleTableBlock({ pageId, block }: Props) {
  const { updateBlock, addDatabaseFromTable, replaceBlock } = useStore();
  const rows = useMemo<string[][]>(
    () => (block.tableRows && block.tableRows.length ? block.tableRows : DEFAULT_ROWS),
    [block.tableRows],
  );
  const cols = rows[0]?.length ?? 0;
  const hasHeader = block.tableHeader !== false;

  const set = (next: string[][]) => updateBlock(pageId, block.id, { tableRows: next });

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
    const dbId = await addDatabaseFromTable({
      headerRow: hasHeader ? rows[0] : Array(cols).fill("").map((_, i) => `Column ${i + 1}`),
      bodyRows: hasHeader ? rows.slice(1) : rows,
    });
    if (!dbId) return;
    replaceBlock(pageId, block.id, {
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
              onChange={(e) => updateBlock(pageId, block.id, { tableHeader: e.target.checked })}
              className="h-3 w-3"
            />
            Header row
          </label>
        </div>
        <button
          type="button"
          onClick={turnIntoDatabase}
          className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[11px] hover:bg-accent"
          title="Convert to a real database with views, filters, and properties"
        >
          <DatabaseIcon className="h-3 w-3" /> Turn into database
        </button>
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
                    <button
                      type="button"
                      onClick={() => delCol(c)}
                      className="absolute -top-2 right-0 hidden group-hover/cell:flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                      aria-label="Delete column"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </td>
              ))}
              <td className="w-6 border-l border-border align-middle text-center">
                <button
                  type="button"
                  onClick={() => delRow(r)}
                  className="opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-destructive"
                  aria-label="Delete row"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex border-t border-border">
        <button
          type="button"
          onClick={addRow}
          className="flex flex-1 items-center justify-center gap-1 py-1 text-[11px] text-muted-foreground hover:bg-accent"
        >
          <Plus className="h-3 w-3" /> Add row
        </button>
        <button
          type="button"
          onClick={addCol}
          className="flex flex-1 items-center justify-center gap-1 border-l border-border py-1 text-[11px] text-muted-foreground hover:bg-accent"
        >
          <Plus className="h-3 w-3" /> Add column
        </button>
      </div>
    </div>
  );
}
