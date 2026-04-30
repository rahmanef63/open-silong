import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Page, PageFont } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/shared/lib/utils";
import { toast } from "sonner";
import {
  pageToMarkdown, pageToPlainText, markdownToBlocks,
  downloadFile, pickFile,
} from "@/shared/lib/markdown";
import { AnalyticsPopover } from "@/slices/analytics";
import { NotifyMePopover } from "@/slices/notifications";
import { MentionsPopover } from "@/slices/mentions";
import { WikiToggleAction } from "@/slices/wiki";
import {
  MoreHorizontal, Search, Type, Ruler, MoveHorizontal,
  Link2, ClipboardCopy, Files, ArrowRight, Trash2,
  Palette, Lock, Unlock,
  Sparkles, MessageSquare, Languages,
  Upload, Download, BookOpen, BarChart3, History, Bell, AtSign,
  Check, ChevronRight,
} from "lucide-react";
import { FONT_OPTIONS } from "./page-actions/fonts";
import { RowButton, Row, ToggleRow, SectionLabel } from "./page-actions/MenuRows";

interface Props {
  page: Page;
  onShowHistory: () => void;
}

export function PageActionsMenu({ page, onShowHistory }: Props) {
  const { updatePage, duplicatePage, deletePage, addBlock, pages, movePage } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [moveOpen, setMoveOpen] = useState(false);

  useEffect(() => {
    if (!open) { setQuery(""); setMoveOpen(false); }
  }, [open]);

  const setFont = (font: PageFont) => updatePage(page.id, { font });
  const toggleSmall = () => updatePage(page.id, { smallText: !page.smallText });
  const toggleFull = () => updatePage(page.id, { fullWidth: !page.fullWidth });
  const toggleLock = () => {
    updatePage(page.id, { locked: !page.locked });
    toast.success(page.locked ? "Page unlocked" : "Page locked");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
    setOpen(false);
  };

  const copyContents = async () => {
    try {
      await navigator.clipboard.writeText(pageToPlainText(page));
      toast.success("Page contents copied");
    } catch {
      toast.error("Failed to copy contents");
    }
    setOpen(false);
  };

  const onDuplicate = async () => {
    setOpen(false);
    const c = await duplicatePage(page.id);
    if (c) navigate(`/p/${c.id}`);
  };

  const onTrash = () => {
    setOpen(false);
    deletePage(page.id);
    navigate("/");
    toast.success("Moved to trash");
  };

  const onExport = () => {
    const md = pageToMarkdown(page);
    const safeTitle = (page.title || "untitled").replace(/[^a-z0-9-_ ]/gi, "_").trim() || "untitled";
    downloadFile(`${safeTitle}.md`, md);
    toast.success("Exported as markdown");
    setOpen(false);
  };

  const onImport = async () => {
    setOpen(false);
    const file = await pickFile(".md,.markdown,text/markdown,text/plain");
    if (!file) return;
    const text = await file.text();
    const blocks = markdownToBlocks(text);
    for (const b of blocks) {
      await addBlock(page.id, page.blocks.length, b.type, {
        text: b.text,
        checked: b.checked,
        lang: b.lang,
      });
    }
    toast.success(`Imported ${blocks.length} blocks`);
  };

  const stub = (label: string) => () => {
    toast.info(`${label} — coming soon`);
    setOpen(false);
  };

  // Move-to candidates: not self, not descendants
  const isDescendant = (targetId: string, ancestorId: string): boolean => {
    let cur = pages.find(p => p.id === targetId);
    while (cur?.parentId) {
      if (cur.parentId === ancestorId) return true;
      cur = pages.find(p => p.id === cur!.parentId);
    }
    return false;
  };
  const moveCandidates = useMemo(
    () => pages.filter(p =>
      !p.trashed && !p.rowOfDatabaseId && p.id !== page.id && !isDescendant(p.id, page.id)
    ),
    [pages, page.id],
  );

  // Action descriptors for search filtering
  const q = query.trim().toLowerCase();
  const match = (label: string) => !q || label.toLowerCase().includes(q);

  // Keyboard shortcut: Ctrl+Alt+L → copy link
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        copyLink();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page.id]);

  const groupVisible = (...labels: string[]) => labels.some(match);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-accent text-muted-foreground"
          aria-label="Page actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[280px] p-0 max-h-[80vh] overflow-y-auto scrollbar-thin"
      >
        {/* Search */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search actions..."
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Font picker */}
        {!q && (
          <div className="grid grid-cols-3 gap-1 p-2 border-b border-border">
            {FONT_OPTIONS.map(opt => {
              const active = (page.font ?? "default") === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setFont(opt.id)}
                  className={cn(
                    "rounded-md border py-2 text-center transition",
                    opt.className,
                    active
                      ? "border-foreground bg-accent"
                      : "border-border hover:bg-accent/50",
                  )}
                >
                  <div className="text-base font-semibold leading-none">Ag</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{opt.label}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Layout toggles */}
        {groupVisible("Small text", "Full width") && (
          <div className="border-b border-border py-1">
            {match("Small text") && (
              <ToggleRow
                icon={Ruler}
                label="Small text"
                checked={!!page.smallText}
                onChange={toggleSmall}
              />
            )}
            {match("Full width") && (
              <ToggleRow
                icon={MoveHorizontal}
                label="Full width"
                checked={!!page.fullWidth}
                onChange={toggleFull}
              />
            )}
          </div>
        )}

        {/* Page actions */}
        {groupVisible("Copy link", "Copy page contents", "Duplicate", "Move to", "Move to Trash") && (
          <div className="border-b border-border py-1">
            {match("Copy link") && (
              <Row icon={Link2} label="Copy link" shortcut="Ctrl+Alt+L" onClick={copyLink} />
            )}
            {match("Copy page contents") && (
              <Row icon={ClipboardCopy} label="Copy page contents" onClick={copyContents} />
            )}
            {match("Duplicate") && (
              <Row icon={Files} label="Duplicate" shortcut="Ctrl+D" onClick={onDuplicate} />
            )}
            {match("Move to") && (
              <div>
                <button
                  onClick={() => setMoveOpen(o => !o)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left"
                >
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1">Move to</span>
                  <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition", moveOpen && "rotate-90")} />
                </button>
                {moveOpen && (
                  <div className="bg-muted/30 border-t border-border max-h-48 overflow-y-auto scrollbar-thin">
                    <button
                      onClick={() => { movePage(page.id, null); toast.success("Moved to root"); setOpen(false); }}
                      className={cn(
                        "flex w-full items-center gap-2 px-5 py-1.5 text-xs hover:bg-accent text-left",
                        page.parentId === null && "text-muted-foreground"
                      )}
                    >
                      {page.parentId === null && <Check className="h-3 w-3" />}
                      {page.parentId !== null && <span className="w-3" />}
                      <span className="flex-1">Workspace root</span>
                    </button>
                    {moveCandidates.length === 0 && (
                      <div className="px-5 py-2 text-xs text-muted-foreground">No other pages</div>
                    )}
                    {moveCandidates.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { movePage(page.id, p.id); toast.success(`Moved into ${p.title || "Untitled"}`); setOpen(false); }}
                        className={cn(
                          "flex w-full items-center gap-2 px-5 py-1.5 text-xs hover:bg-accent text-left",
                          page.parentId === p.id && "text-muted-foreground"
                        )}
                      >
                        {page.parentId === p.id && <Check className="h-3 w-3" />}
                        {page.parentId !== p.id && <span className="w-3" />}
                        <span>{p.icon}</span>
                        <span className="flex-1 truncate">{p.title || "Untitled"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {match("Move to Trash") && (
              <Row icon={Trash2} label="Move to Trash" onClick={onTrash} destructive />
            )}
          </div>
        )}

        {/* Customize */}
        {groupVisible("Customize page", "Lock page") && (
          <div className="border-b border-border py-1">
            {match("Customize page") && (
              <Row icon={Palette} label="Customize page" onClick={stub("Customize page")} />
            )}
            {match("Lock page") && (
              <ToggleRow
                icon={page.locked ? Lock : Unlock}
                label="Lock page"
                checked={!!page.locked}
                onChange={toggleLock}
              />
            )}
          </div>
        )}

        {/* AI */}
        {groupVisible("Use with AI", "Suggest edits", "Translate") && (
          <div className="border-b border-border py-1">
            <SectionLabel>AI</SectionLabel>
            {match("Use with AI") && <Row icon={Sparkles} label="Use with AI" onClick={stub("Use with AI")} />}
            {match("Suggest edits") && <Row icon={MessageSquare} label="Suggest edits" onClick={stub("Suggest edits")} />}
            {match("Translate") && <Row icon={Languages} label="Translate" onClick={stub("Translate")} />}
          </div>
        )}

        {/* Tools */}
        {groupVisible("Import", "Export", "Turn into wiki", "Updates & analytics", "Version history", "Notify me", "Mentions") && (
          <div className="py-1">
            {match("Import") && <Row icon={Upload} label="Import" onClick={onImport} />}
            {match("Export") && <Row icon={Download} label="Export" onClick={onExport} />}
            {match("Turn into wiki") && (
              <WikiToggleAction pageId={page.id} onClose={() => setOpen(false)} />
            )}
            {match("Updates & analytics") && (
              <AnalyticsPopover
                page={page}
                trigger={<RowButton icon={BarChart3} label="Updates & analytics" />}
              />
            )}
            {match("Version history") && (
              <Row icon={History} label="Version history" onClick={() => { setOpen(false); onShowHistory(); }} />
            )}
            {match("Notify me") && (
              <NotifyMePopover
                pageId={page.id}
                trigger={<RowButton icon={Bell} label="Notify me" />}
              />
            )}
            {match("Mentions") && (
              <MentionsPopover
                trigger={<RowButton icon={AtSign} label="Mentions" />}
              />
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
