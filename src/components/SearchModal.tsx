import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import { useStore } from "@/lib/store";
import { Search, FileText, Clock } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function SearchModal({ open, onOpenChange }: Props) {
  const { search, pages, recents } = useStore();
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const results = q ? search(q) : [];
  const recent = !q ? recents.map(id => pages.find(p => p.id === id)).filter(Boolean).slice(0, 5) : [];

  useEffect(() => { if (!open) setQ(""); }, [open]);

  const go = (id: string) => { navigate(`/p/${id}`); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-xl gap-0 top-[20%] translate-y-0">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search pages, blocks…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-[420px] overflow-y-auto p-2">
          {q && results.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">No results for "{q}"</div>
          )}
          {!q && recent.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Recent
              </div>
              {recent.map(p => p && (
                <Row key={p.id} icon={p.icon} title={p.title || "Untitled"} subtitle={preview(p.blocks[0]?.text)} onClick={() => go(p.id)} />
              ))}
            </>
          )}
          {results.map(p => (
            <Row key={p.id} icon={p.icon} title={p.title || "Untitled"} subtitle={preview(matchSnippet(p, q))} onClick={() => go(p.id)} />
          ))}
          {!q && recent.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">Start typing to search your workspace</div>
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

function matchSnippet(p: any, q: string) {
  const s = q.toLowerCase();
  const block = p.blocks.find((b: any) => b.text.toLowerCase().includes(s));
  return block?.text || p.blocks[0]?.text || "";
}

function Row({ icon, title, subtitle, onClick }: { icon: string; title: string; subtitle?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-accent transition">
      <span className="text-lg leading-none">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );
}
