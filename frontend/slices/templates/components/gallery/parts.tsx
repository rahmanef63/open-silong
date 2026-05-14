import { useMemo } from "react";
import { FileText, Rows3, Database } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { templateStats } from "../../lib/previewTemplate";

export interface TemplateMeta {
  _id: string;
  name: string;
  icon: string;
  category: string;
  description?: string | null;
  /** Promotional images — admin-curated URLs. First = hero thumb. */
  images?: string[];
}

const CATEGORY_TINTS: Array<[string, string]> = [
  ["from-rose-500/20 to-rose-500/5", "text-rose-500"],
  ["from-amber-500/20 to-amber-500/5", "text-amber-500"],
  ["from-emerald-500/20 to-emerald-500/5", "text-emerald-500"],
  ["from-sky-500/20 to-sky-500/5", "text-sky-500"],
  ["from-violet-500/20 to-violet-500/5", "text-violet-500"],
  ["from-pink-500/20 to-pink-500/5", "text-pink-500"],
  ["from-orange-500/20 to-orange-500/5", "text-orange-500"],
  ["from-teal-500/20 to-teal-500/5", "text-teal-500"],
];

function tintFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return CATEGORY_TINTS[h % CATEGORY_TINTS.length];
}

export function CategoryChip({
  label, count, active, onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs whitespace-nowrap transition-colors shrink-0",
        active
          ? "border-brand bg-brand/15 text-brand"
          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      <span>{label}</span>
      <span className={cn(
        "tabular-nums text-[10px]",
        active ? "text-brand/80" : "text-muted-foreground/60",
      )}>{count}</span>
    </button>
  );
}

export function TemplateCard({
  tpl, active, onSelect,
}: {
  tpl: TemplateMeta;
  active: boolean;
  onSelect: () => void;
}) {
  const [bg, fg] = tintFor(tpl.category);
  const hero = tpl.images?.[0];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "group flex flex-col rounded-xl border bg-card text-left overflow-hidden transition-all",
        active
          ? "border-brand ring-2 ring-brand/30 shadow-md"
          : "border-border hover:border-foreground/40 hover:shadow-md hover:-translate-y-0.5",
      )}
    >
      <div className={cn("relative h-32 grid place-items-center overflow-hidden", !hero && "bg-gradient-to-br", !hero && bg)}>
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className={cn("text-5xl leading-none drop-shadow-sm", fg)}>
            <DynamicIcon value={tpl.icon} />
          </div>
        )}
        <span className="absolute top-2 right-2 rounded-full bg-background/80 backdrop-blur px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          Free
        </span>
      </div>
      <div className="px-3 py-2.5 flex flex-col gap-1 min-h-[64px]">
        <div className="text-sm font-semibold truncate flex items-center gap-1.5">
          <span className="text-base leading-none shrink-0"><DynamicIcon value={tpl.icon} /></span>
          <span className="truncate">{tpl.name}</span>
        </div>
        <div className="text-[11px] text-muted-foreground truncate">{tpl.category}</div>
      </div>
    </button>
  );
}

export function FeaturedBanner({
  tpl, onSelect,
}: {
  tpl: TemplateMeta;
  onSelect: () => void;
}) {
  const [bg, fg] = tintFor(tpl.name);
  const hero = tpl.images?.[0];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex items-stretch rounded-2xl overflow-hidden border border-border text-left transition-all hover:shadow-lg",
        !hero && "bg-gradient-to-br",
        !hero && bg,
      )}
    >
      <div className="flex-1 p-5 flex flex-col justify-between min-h-[180px] z-10">
        <div>
          <span className="inline-block rounded-md bg-background/70 backdrop-blur px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground mb-2">
            Featured
          </span>
          <div className="text-lg font-semibold leading-tight">{tpl.name}</div>
          {tpl.description && (
            <div className="text-xs text-muted-foreground mt-1.5 line-clamp-2 max-w-[280px]">
              {tpl.description}
            </div>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground">{tpl.category}</span>
      </div>
      {hero ? (
        <div className="relative w-44 shrink-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      ) : (
        <div className={cn("w-32 grid place-items-center text-6xl shrink-0", fg)}>
          <DynamicIcon value={tpl.icon} />
        </div>
      )}
    </button>
  );
}

export function StatsRow({ json }: { json: unknown }) {
  const stats = useMemo(() => templateStats(json), [json]);
  return (
    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2">
      <span className="flex items-center gap-1">
        <FileText className="h-3 w-3" /> {stats.pages} {stats.pages === 1 ? "page" : "pages"}
      </span>
      <span className="flex items-center gap-1">
        <Rows3 className="h-3 w-3" /> {stats.blocks} blocks
      </span>
      {stats.databases > 0 && (
        <span className="flex items-center gap-1">
          <Database className="h-3 w-3" /> {stats.databases} {stats.databases === 1 ? "DB" : "DBs"}
        </span>
      )}
    </div>
  );
}
