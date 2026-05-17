import { useEffect, useState } from "react";
import { Page } from "@/shared/types/domain";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { AnalyticsPopover } from "@/slices/analytics";
import { NotifyMePopover } from "@/slices/notifications";
import { MentionsPopover } from "@/slices/mentions";
import { WikiToggleAction } from "@/slices/wiki";
import {
  MoreHorizontal, Search, Ruler, MoveHorizontal,
  Link2, ClipboardCopy, Files, Trash2,
  Palette, Lock, Unlock,
  Sparkles, MessageSquare, Languages,
  Upload, Download, BarChart3, History, Bell, AtSign,
  FileJson, FileArchive,
} from "lucide-react";
import { FONT_OPTIONS } from "./page-actions/fonts";
import { RowButton, Row, ToggleRow, SectionLabel } from "./page-actions/MenuRows";
import { MoveToSubmenu } from "./page-actions/MoveToSubmenu";
import { usePageActions } from "./page-actions/usePageActions";

interface Props {
  page: Page;
  onShowHistory: () => void;
}

export function PageActionsMenu({ page, onShowHistory }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const close = () => setOpen(false);
  const actions = usePageActions(page, close);

  useEffect(() => { if (!open) setQuery(""); }, [open]);

  const q = query.trim().toLowerCase();
  const match = (label: string) => !q || label.toLowerCase().includes(q);
  const groupVisible = (...labels: string[]) => labels.some(match);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          aria-label="Page actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[280px] p-0 max-h-[80vh] overflow-y-auto scrollbar-thin"
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actions..."
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
          />
        </div>

        {!q && (
          <div className="grid grid-cols-3 gap-1 p-2 border-b border-border">
            {FONT_OPTIONS.map((opt) => {
              const active = (page.font ?? "default") === opt.id;
              return (
                <Button
                  variant="outline"
                  key={opt.id}
                  variant="outline"
                  onClick={() => actions.setFont(opt.id)}
                  className={cn(
                    "h-auto flex-col rounded-md py-2 text-center font-normal transition",
                    opt.className,
                    active ? "border-foreground bg-accent" : "hover:bg-accent/50",
                  )}
                >
                  <div className="text-base font-semibold leading-none">Ag</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{opt.label}</div>
                </Button>
              );
            })}
          </div>
        )}

        {groupVisible("Small text", "Full width") && (
          <div className="border-b border-border py-1">
            {match("Small text") && (
              <ToggleRow icon={Ruler} label="Small text" checked={!!page.smallText} onChange={actions.toggleSmall} />
            )}
            {match("Full width") && (
              <ToggleRow icon={MoveHorizontal} label="Full width" checked={!!page.fullWidth} onChange={actions.toggleFull} />
            )}
          </div>
        )}

        {groupVisible("Copy link", "Copy page contents", "Duplicate", "Move to", "Move to Trash") && (
          <div className="border-b border-border py-1">
            {match("Copy link") && (
              <Row icon={Link2} label="Copy link" shortcut="Ctrl+Alt+L" onClick={actions.copyLink} />
            )}
            {match("Copy page contents") && (
              <Row icon={ClipboardCopy} label="Copy page contents" onClick={actions.copyContents} />
            )}
            {match("Duplicate") && (
              <Row icon={Files} label="Duplicate" shortcut="Ctrl+D" onClick={actions.onDuplicate} />
            )}
            {match("Move to") && <MoveToSubmenu page={page} close={close} />}
            {match("Move to Trash") && (
              <Row icon={Trash2} label="Move to Trash" onClick={actions.onTrash} destructive />
            )}
          </div>
        )}

        {groupVisible("Customize page", "Lock page") && (
          <div className="border-b border-border py-1">
            {match("Customize page") && (
              <Row icon={Palette} label="Customize page" onClick={actions.stub("Customize page")} />
            )}
            {match("Lock page") && (
              <ToggleRow
                icon={page.locked ? Lock : Unlock}
                label="Lock page"
                checked={!!page.locked}
                onChange={actions.toggleLock}
              />
            )}
          </div>
        )}

        {groupVisible("Use with AI", "Suggest edits", "Translate") && (
          <div className="border-b border-border py-1">
            <SectionLabel>AI</SectionLabel>
            {match("Use with AI") && <Row icon={Sparkles} label="Use with AI" onClick={actions.stub("Use with AI")} />}
            {match("Suggest edits") && <Row icon={MessageSquare} label="Suggest edits" onClick={actions.stub("Suggest edits")} />}
            {match("Translate") && <Row icon={Languages} label="Translate" onClick={actions.stub("Translate")} />}
          </div>
        )}

        {groupVisible("Export JSON", "Export Markdown", "Import JSON", "Import Markdown", "Import ZIP", "Turn into wiki", "Updates & analytics", "Version history", "Notify me", "Mentions") && (
          <div className="py-1">
            {match("Export JSON") && <Row icon={FileJson} label="Export JSON (this page + subtree)" onClick={actions.onExportJson} />}
            {match("Export Markdown") && <Row icon={Download} label="Export as Markdown" onClick={actions.onExportMd} />}
            {match("Import JSON") && <Row icon={FileJson} label="Import JSON" onClick={actions.onImportJson} />}
            {match("Import Markdown") && <Row icon={Upload} label="Import Markdown" onClick={actions.onImportMd} />}
            {match("Import ZIP") && <Row icon={FileArchive} label="Import ZIP under this page" onClick={actions.onImportZip} />}
            {match("Turn into wiki") && <WikiToggleAction pageId={page.id} onClose={close} />}
            {match("Updates & analytics") && (
              <AnalyticsPopover page={page} trigger={<RowButton icon={BarChart3} label="Updates & analytics" />} />
            )}
            {match("Version history") && (
              <Row icon={History} label="Version history" onClick={() => { close(); onShowHistory(); }} />
            )}
            {match("Notify me") && (
              <NotifyMePopover pageId={page.id} trigger={<RowButton icon={Bell} label="Notify me" />} />
            )}
            {match("Mentions") && (
              <MentionsPopover trigger={<RowButton icon={AtSign} label="Mentions" />} />
            )}
          </div>
        )}

        {q && !groupVisible(
          "Small text", "Full width", "Copy link", "Copy page contents", "Duplicate",
          "Move to", "Move to Trash", "Customize page", "Lock page", "Use with AI",
          "Suggest edits", "Translate", "Import", "Export", "Turn into wiki",
          "Updates & analytics", "Version history", "Notify me", "Mentions",
        ) && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">No matching actions</div>
        )}
      </PopoverContent>
    </Popover>
  );
}
