import { useState } from "react";
import { Database as DbIcon, Download, Sparkles, Upload } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";
import { useStore } from "@/shared/lib/store";
import type { Database, Page } from "@/shared/types/domain";
import { CsvImportDialog, downloadCsv, exportDatabaseToCsv } from "@/slices/database-csv";
import { JsonImportDialog } from "./JsonImportDialog";
import { AIAssistDialog } from "./AIAssistDialog";
import { downloadJson, exportDatabase } from "../lib/serialize";

interface Props {
  db: Database;
  rows: Page[];
}

/** One menu for all data CRUD: CSV ↔︎ JSON export/import plus AI assist. */
export function DataMenu({ db, rows }: Props) {
  const { pages } = useStore();
  const [csvImport, setCsvImport] = useState(false);
  const [jsonImport, setJsonImport] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const onExportCsv = () => {
    const csv = exportDatabaseToCsv(db, rows, pages);
    downloadCsv(`${db.name || "database"}.csv`, csv);
  };
  const onExportJson = () => {
    const payload = exportDatabase(db, rows);
    downloadJson(`${db.name || "database"}.json`, payload);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto gap-1 px-2 py-1 text-xs font-normal text-muted-foreground [&_svg]:size-3.5"
            aria-label="Import / export / AI"
            title="Import / export / AI"
          >
            <DbIcon className="h-3.5 w-3.5" /> Data
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs">CSV</DropdownMenuLabel>
          <DropdownMenuItem onClick={onExportCsv}>
            <Download className="mr-2 h-3.5 w-3.5" /> Export CSV ({rows.length})
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCsvImport(true)}>
            <Upload className="mr-2 h-3.5 w-3.5" /> Import CSV…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs">JSON</DropdownMenuLabel>
          <DropdownMenuItem onClick={onExportJson}>
            <Download className="mr-2 h-3.5 w-3.5" /> Export JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setJsonImport(true)}>
            <Upload className="mr-2 h-3.5 w-3.5" /> Import JSON…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setAiOpen(true)}>
            <Sparkles className="mr-2 h-3.5 w-3.5 text-amber-500" /> AI assist…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CsvImportDialog db={db} open={csvImport} onOpenChange={setCsvImport} />
      <JsonImportDialog open={jsonImport} onOpenChange={setJsonImport} />
      <AIAssistDialog db={db} open={aiOpen} onOpenChange={setAiOpen} />
    </>
  );
}
