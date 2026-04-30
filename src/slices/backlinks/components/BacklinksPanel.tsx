import { Link2, ChevronDown, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import { useBacklinks } from "../hooks/useBacklinks";

interface Props {
  pageId: string;
}

export function BacklinksPanel({ pageId }: Props) {
  const items = useBacklinks(pageId);
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  if (items.length === 0) return null;

  const grouped = new Map<string, typeof items>();
  for (const it of items) {
    const arr = grouped.get(it.pageId) ?? [];
    arr.push(it);
    grouped.set(it.pageId, arr);
  }

  return (
    <section className="mt-8 border-t border-border pt-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Link2 className="h-3 w-3" />
        Backlinks <span className="text-brand normal-case">({items.length})</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {Array.from(grouped.entries()).map(([pid, group]) => (
            <div key={pid} className="rounded-md border border-border bg-card overflow-hidden">
              <button
                onClick={() => navigate(`/p/${pid}`)}
                className="flex w-full items-center gap-1.5 px-3 py-2 hover:bg-accent text-sm font-medium border-b border-border/40"
              >
                <span>{group[0].pageIcon}</span>
                <span className="flex-1 truncate text-left">{group[0].pageTitle}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{group.length}</span>
              </button>
              {group.map((bl, i) => (
                <button
                  key={`${bl.blockId}-${i}`}
                  onClick={() => navigate(`/p/${bl.pageId}`)}
                  className="flex w-full items-start gap-2 px-3 py-1.5 text-left text-xs hover:bg-accent/50 last:border-0"
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex items-center rounded px-1 py-0.5 text-[9px] font-medium uppercase tracking-wider shrink-0",
                      bl.kind === "page-link"
                        ? "bg-brand/15 text-brand"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {bl.kind === "page-link" ? "Link" : "Mention"}
                  </span>
                  <span className="flex-1 text-muted-foreground line-clamp-2">{bl.preview || "(empty)"}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
