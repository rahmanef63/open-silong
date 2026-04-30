import { useState } from "react";
import { Download, Upload } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/lib/store";
import { downloadCsv, exportDatabaseToCsv } from "../lib/csv";
import type { Database, Page } from "@/lib/types";
import { CsvImportDialog } from "./CsvImportDialog";

interface Props {
  db: Database;
  rows: Page[];
}

export function CsvActions({ db, rows }: Props) {
  const { pages } = useStore();
  const [importOpen, setImportOpen] = useState(false);

  const onExport = () => {
    const csv = exportDatabaseToCsv(db, rows, pages);
    downloadCsv(`${db.name || "database"}.csv`, csv);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-accent text-muted-foreground"
            aria-label="CSV import / export"
          >
            CSV
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="text-xs">Data</DropdownMenuLabel>
          <DropdownMenuItem onClick={onExport}>
            <Download className="mr-2 h-3.5 w-3.5" />
            Export {rows.length} row{rows.length === 1 ? "" : "s"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-3.5 w-3.5" /> Import CSV…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CsvImportDialog db={db} open={importOpen} onOpenChange={setImportOpen} />
    </>
  );
}
