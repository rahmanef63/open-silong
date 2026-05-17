import { useEffect, useState } from "react";
import { useNavigate } from "@/shared/lib/router";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/shared/ui/dialog";
import { useStore } from "@/shared/lib/store";
import { useSearch } from "@/slices/search";
import { Search, FileText, Clock, Database as DatabaseIcon, Loader2 } from "lucide-react";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { Button } from "@/shared/ui/button";
import { ROUTES } from "@/shared/lib/routes";
import { DEFAULT_SEARCH_LABELS, type SearchModalLabels } from "../lib/types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Override copy strings. Defaults preserve the legacy Nosion strings. */
  labels?: SearchModalLabels;
}

export function SearchModal({ open, onOpenChange, labels }: Props) {
  const t = { ...DEFAULT_SEARCH_LABELS, ...labels };
  const { pages, recents } = useStore();
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { isLoading, result } = useSearch(q);
  const recent = !q ? recents.map(id => pages.find(p => p.id === id)).filter(Boolean).slice(0, 5) : [];
  const totalHits = result.pages.length + result.databases.length;

  useEffect(() => { if (!open) setQ(""); }, [open]);

  const goPage = (id: string) => { navigate(ROUTES.page(id)); onOpenChange(false); };
  const goDb = (id: string) => {
    navigate(ROUTES.database(id));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-xl gap-0 top-[20%] translate-y-0">
        <DialogTitle className="sr-only">{t.searchTitle}</DialogTitle>
        <DialogDescription className="sr-only">
          {t.searchDescription}
        </DialogDescription>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">{t.escapeHint}</kbd>
        </div>
        <div className="max-h-[420px] overflow-y-auto p-2">
          {q && !isLoading && totalHits === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">{t.noResults(q)}</div>
          )}
          {!q && recent.length > 0 && (
            <>
              <SectionHeader icon={<Clock className="h-3 w-3" />}>{t.recentHeading}</SectionHeader>
              {recent.map(p => p && (
                <Row key={p.id} icon={p.icon} title={p.title || "Untitled"} subtitle={preview(p.blocks[0]?.text)} onClick={() => goPage(p.id)} />
              ))}
            </>
          )}
          {result.pages.length > 0 && (
            <>
              <SectionHeader icon={<FileText className="h-3 w-3" />}>{t.pagesHeading}</SectionHeader>
              {result.pages.map(p => (
                <Row key={p.id} icon={p.icon} title={p.title || "Untitled"} onClick={() => goPage(p.id)} />
              ))}
            </>
          )}
          {result.databases.length > 0 && (
            <>
              <SectionHeader icon={<DatabaseIcon className="h-3 w-3" />}>{t.databasesHeading}</SectionHeader>
              {result.databases.map(d => (
                <Row key={d.id} icon={d.icon} title={d.name || "Untitled"} onClick={() => goDb(d.id)} kind="db" />
              ))}
            </>
          )}
          {!q && recent.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">{t.emptyHint}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function preview(text?: string) {
  if (!text) return "";
  return text.length > 80 ? text.slice(0, 80) + "…" : text;
}

function SectionHeader({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
      {icon} {children}
    </div>
  );
}

function Row({ icon, title, subtitle, onClick, kind = "page" }: { icon: string; title: string; subtitle?: string; onClick: () => void; kind?: "page" | "db" }) {
  const Icon = kind === "db" ? DatabaseIcon : FileText;
  return (
    <Button variant="ghost" onClick={onClick} className="flex w-full h-auto items-center gap-3 rounded-md px-3 py-2 text-left font-normal justify-start [&_svg]:size-3.5">
      <DynamicIcon value={icon} className="text-lg" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
    </Button>
  );
}
