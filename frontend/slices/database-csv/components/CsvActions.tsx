import { useState } from "react";
import { Download, Upload } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";
import { useStore } from "@/shared/lib/store";
import { downloadCsv, exportDatabaseToCsv } from "../lib/csv";
import type { Database, Page } from "@/shared/types/domain";
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
          <Button
            variant="ghost"
            className="h-auto gap-1 rounded-md px-2 py-1 text-xs font-normal text-muted-foreground"
            aria-label="CSV import / export"
          >
            CSV
          </Button>
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
