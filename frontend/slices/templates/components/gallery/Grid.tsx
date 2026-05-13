import { Search } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { TemplateCard, type TemplateMeta } from "./parts";

export function TemplateGrid({
  list, filtered, search, onSearchChange, selectedId, onSelect, mobilePreviewOpen,
}: {
  list: TemplateMeta[] | undefined;
  filtered: TemplateMeta[];
  search: string;
  onSearchChange: (q: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  mobilePreviewOpen: boolean;
}) {
  return (
    <section
      className={cn(
        "flex-1 min-h-0 flex flex-col overflow-hidden",
        mobilePreviewOpen ? "hidden md:flex" : "flex",
      )}
    >
      <div className="px-4 py-3 border-b border-border bg-card sticky top-0 z-10 shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search templates…"
            className="w-full bg-background border border-border rounded-md pl-7 pr-3 py-1.5 text-sm outline-none focus:border-brand"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3">
        {list === undefined && (
          <div className="text-sm text-muted-foreground text-center py-8">Loading templates…</div>
        )}
        {list && filtered.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            {search ? "No templates match your search." : "No templates in this category."}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {filtered.map((tpl) => (
            <TemplateCard
              key={String(tpl._id)}
              tpl={tpl}
              active={selectedId === String(tpl._id)}
              onSelect={() => onSelect(String(tpl._id))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
