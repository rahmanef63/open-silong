import { Suspense, useEffect, useState } from "react";
import { Page } from "@/shared/types/domain";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Drawer, DrawerContent, DrawerTitle } from "@/shared/ui/drawer-lazy";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { PortalContainerProvider } from "@/shared/ui/portal-container";
import { AnalyticsPopover } from "@/slices/analytics";
import { NotifyMePopover } from "@/slices/notifications";
import { MentionsPopover } from "@/slices/mentions";
import { WikiToggleAction } from "@/slices/wiki";
import { TweakcnSwitcher } from "@/slices/theme-presets";
import {
  MoreHorizontal, Search, Ruler, MoveHorizontal,
  Link2, ClipboardCopy, Files, Trash2,
  Palette, Lock, Unlock,
  Sparkles, MessageSquare, Languages,
  BarChart3, History, Bell, AtSign, Star,
} from "lucide-react";
import { FONT_OPTIONS } from "./page-actions/fonts";
import { RowButton, Row, ToggleRow, SectionLabel } from "./page-actions/MenuRows";
import { MoveToSubmenu } from "./page-actions/MoveToSubmenu";
import { DataSubmenu } from "./page-actions/DataSubmenu";
import { usePageActions } from "./page-actions/usePageActions";

interface Props {
  page: Page;
  onShowHistory: () => void;
}

export function PageActionsMenu({ page, onShowHistory }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const isMobile = useIsMobile();
  // Lazy-mount the vaul drawer on first open, then keep it mounted so the
  // swipe/close animation plays (unmounting on close would cut it) — vaul stays
  // out of first-load until the menu is actually opened.
  const [drawerMounted, setDrawerMounted] = useState(false);
  // The drawer content node — nested submenus (Popover/DropdownMenu) portal
  // INTO it so the vaul modal doesn't inert them out of existence.
  const [drawerEl, setDrawerEl] = useState<HTMLElement | null>(null);
  const close = () => setOpen(false);
  const actions = usePageActions(page, close);

  useEffect(() => { if (!open) setQuery(""); }, [open]);

  const q = query.trim().toLowerCase();
  const match = (label: string) => !q || label.toLowerCase().includes(q);
  const groupVisible = (...labels: string[]) => labels.some(match);

  const trigger = (
    <MoreHorizontal className="h-4 w-4" />
  );

  const body = (
    <>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          // Autofocus only on desktop — on a mobile bottom-sheet it would pop
          // the on-screen keyboard the moment the menu opens.
          autoFocus={!isMobile}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search actions..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 sm:text-xs"
        />
      </div>

      {/* Favorite lives as a persistent star in the header on >=sm;
          on mobile that icon is collapsed away, so surface it here. */}
      {!q && (
        <div className="border-b border-border py-1 sm:hidden">
          <ToggleRow
            icon={Star}
            label="Add to favorites"
            checked={!!page.favorite}
            onChange={actions.onToggleFavorite}
          />
        </div>
      )}

      {!q && (
        <div className="grid grid-cols-3 gap-1 p-2 border-b border-border">
          {FONT_OPTIONS.map((opt) => {
            const active = (page.font ?? "default") === opt.id;
            return (
              <Button
                variant="outline"
                key={opt.id}
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

      {groupVisible("Data", "Turn into wiki", "Updates & analytics", "Version history", "Notify me", "Mentions") && (
        <div className="py-1">
          {match("Data") && (
            <DataSubmenu
              close={close}
              actions={{
                onExportPdf: actions.onExportPdf,
                onExportMd: actions.onExportMd,
                onExportHtml: actions.onExportHtml,
                onExportTxt: actions.onExportTxt,
                onExportJson: actions.onExportJson,
                onImportMd: actions.onImportMd,
                onImportJson: actions.onImportJson,
                onImportZip: actions.onImportZip,
              }}
            />
          )}
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

      {/* Theme & color — mobile only, pinned to the bottom of the menu. */}
      {!q && (
        <div className="flex items-center justify-between border-t border-border px-3 py-1.5 md:hidden">
          <span className="flex items-center gap-2 text-sm">
            <Palette className="h-3.5 w-3.5 text-muted-foreground" /> Theme &amp; color
          </span>
          <TweakcnSwitcher size="mobile" />
        </div>
      )}

      {q && !groupVisible(
        "Small text", "Full width", "Copy link", "Copy page contents", "Duplicate",
        "Move to", "Move to Trash", "Customize page", "Lock page", "Use with AI",
        "Suggest edits", "Translate", "Data", "Turn into wiki",
        "Updates & analytics", "Version history", "Notify me", "Mentions",
      ) && (
        <div className="px-3 py-6 text-center text-xs text-muted-foreground">No matching actions</div>
      )}
    </>
  );

  // Mobile (<768px): a bottom-sheet drawer — thumb-friendly, swipe-to-dismiss.
  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-muted-foreground"
          aria-label="Page actions"
          onClick={() => { setDrawerMounted(true); setOpen(true); }}
        >
          {trigger}
        </Button>
        {drawerMounted && (
          <Suspense fallback={null}>
            <Drawer open={open} onOpenChange={setOpen}>
              <DrawerContent ref={setDrawerEl} className="max-h-[85dvh]">
                <DrawerTitle className="sr-only">Page actions</DrawerTitle>
                {/* Submenus portal into the drawer node, not body. */}
                <PortalContainerProvider value={drawerEl}>
                  <div className="min-h-0 overflow-y-auto overscroll-contain pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    {body}
                  </div>
                </PortalContainerProvider>
              </DrawerContent>
            </Drawer>
          </Suspense>
        )}
      </>
    );
  }

  // Desktop (>=768px): the anchored dropdown popover.
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          aria-label="Page actions"
        >
          {trigger}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[280px] p-0 max-h-[80vh] overflow-y-auto scrollbar-thin"
      >
        {body}
      </PopoverContent>
    </Popover>
  );
}
