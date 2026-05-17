/** Collapsible "Data" submenu — groups every page-level export/import
 *  action (PDF · Markdown · JSON · ZIP) into a single row. Mirrors the
 *  shape of `MoveToSubmenu`: click row → expand inline, click again →
 *  collapse. Keeps the parent PageActionsMenu compact.
 */

import { useState } from "react";
import {
  ChevronRight, Database,
  FileText, FileJson, Download,
  Upload, FileArchive,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Row } from "./MenuRows";

interface Actions {
  onExportPdf: () => void;
  onExportMd: () => void;
  onExportJson: () => void;
  onImportMd: () => void;
  onImportJson: () => void;
  onImportZip: () => void;
}

interface Props {
  actions: Actions;
}

export function DataSubmenu({ actions }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button
        variant="ghost"
        onClick={() => setOpen((o) => !o)}
        className="h-auto w-full justify-start gap-2 rounded-none px-3 py-1.5 text-sm font-normal [&_svg]:size-3.5"
      >
        <Database className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="flex-1 text-left">Data</span>
        <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition", open && "rotate-90")} />
      </Button>
      {open && (
        <div className="bg-muted/30 border-t border-border">
          <div className="px-3 pt-1.5 pb-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            Export
          </div>
          <Row icon={FileText} label="Export as PDF (print)" onClick={actions.onExportPdf} />
          <Row icon={Download} label="Export as Markdown" onClick={actions.onExportMd} />
          <Row icon={FileJson} label="Export JSON (this page + subtree)" onClick={actions.onExportJson} />
          <div className="border-t border-border" />
          <div className="px-3 pt-1.5 pb-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            Import
          </div>
          <Row icon={Upload} label="Import Markdown" onClick={actions.onImportMd} />
          <Row icon={FileJson} label="Import JSON" onClick={actions.onImportJson} />
          <Row icon={FileArchive} label="Import ZIP under this page" onClick={actions.onImportZip} />
        </div>
      )}
    </div>
  );
}
