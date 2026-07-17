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
  Upload, FileArchive, FileCode, Type,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";
import { useIsMobile } from "@/shared/hooks/use-mobile";

interface Actions {
  onExportPdf: () => void;
  onExportMd: () => void;
  onExportHtml: () => void;
  onExportTxt: () => void;
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
  const isMobile = useIsMobile();
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
      <DropdownMenuContent
        side={isMobile ? "bottom" : "right"}
        align={isMobile ? "center" : "start"}
        sideOffset={4}
        collisionPadding={12}
        className={isMobile ? "w-[min(20rem,calc(100vw-2rem))]" : "w-64"}
      >
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Export — Notion-compatible
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={fire(actions.onExportMd)} className="gap-2 text-xs">
          <Download className="h-3.5 w-3.5 text-muted-foreground" />
          Markdown <span className="ml-auto text-[10px] text-muted-foreground/60">.md</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={fire(actions.onExportHtml)} className="gap-2 text-xs">
          <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
          HTML <span className="ml-auto text-[10px] text-muted-foreground/60">.html</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={fire(actions.onExportTxt)} className="gap-2 text-xs">
          <Type className="h-3.5 w-3.5 text-muted-foreground" />
          Plain text <span className="ml-auto text-[10px] text-muted-foreground/60">.txt</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={fire(actions.onExportPdf)} className="gap-2 text-xs">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          PDF (browser print) <span className="ml-auto text-[10px] text-muted-foreground/60">.pdf</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Export — Silong-only
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={fire(actions.onExportJson)} className="gap-2 text-xs">
          <FileJson className="h-3.5 w-3.5 text-muted-foreground" />
          JSON (page + subtree) <span className="ml-auto text-[10px] text-muted-foreground/60">.json</span>
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
