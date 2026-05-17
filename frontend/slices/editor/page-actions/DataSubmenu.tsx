/** "Data" row — opens a side-popout DropdownMenu (NOT inline accordion).
 *
 *  Lives inside the parent PageActionsMenu Popover. Standalone
 *  DropdownMenu so the submenu floats to the right of the parent row,
 *  matching Notion / macOS menu ergonomics. Item clicks auto-close
 *  this dropdown; parent `close()` is forwarded so the whole stack
 *  collapses after an action fires.
 */

import {
  ChevronRight, Database,
  FileText, FileJson, Download,
  Upload, FileArchive,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";

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
  /** Parent PageActionsMenu close — fired after every item click so the
   *  whole popover stack collapses, not just the submenu dropdown. */
  close: () => void;
}

export function DataSubmenu({ actions, close }: Props) {
  const fire = (fn: () => void) => () => { fn(); close(); };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto w-full justify-start gap-2 rounded-none px-3 py-1.5 text-sm font-normal [&_svg]:size-3.5 data-[state=open]:bg-accent"
        >
          <Database className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="flex-1 text-left">Data</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" sideOffset={4} className="w-60">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Export
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={fire(actions.onExportPdf)} className="gap-2 text-xs">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          Export as PDF (print)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={fire(actions.onExportMd)} className="gap-2 text-xs">
          <Download className="h-3.5 w-3.5 text-muted-foreground" />
          Export as Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={fire(actions.onExportJson)} className="gap-2 text-xs">
          <FileJson className="h-3.5 w-3.5 text-muted-foreground" />
          Export JSON (page + subtree)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Import
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={fire(actions.onImportMd)} className="gap-2 text-xs">
          <Upload className="h-3.5 w-3.5 text-muted-foreground" />
          Import Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={fire(actions.onImportJson)} className="gap-2 text-xs">
          <FileJson className="h-3.5 w-3.5 text-muted-foreground" />
          Import JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={fire(actions.onImportZip)} className="gap-2 text-xs">
          <FileArchive className="h-3.5 w-3.5 text-muted-foreground" />
          Import ZIP under this page
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
