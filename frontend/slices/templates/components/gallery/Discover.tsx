import { Search } from "lucide-react";
import { CategoryChip, FeaturedBanner, TemplateCard, type TemplateMeta } from "./parts";

export function Discover({
  list, filtered, search, onSearchChange,
  totalCount, categories, activeCategory, onPickCategory,
  selectedId, onSelect,
}: {
  list: TemplateMeta[] | undefined;
  filtered: TemplateMeta[];
  search: string;
  onSearchChange: (q: string) => void;
  totalCount: number;
  categories: { name: string; count: number }[];
  activeCategory: string;
  onPickCategory: (name: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const featured = (list ?? []).slice(0, 2);
  const showFeatured = !search && activeCategory === "__all__" && featured.length > 0;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Get started faster with templates
          </h2>
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Describe what template you need…"
              className="w-full bg-background border border-border rounded-full pl-10 pr-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1 -mx-1 px-1">
          <CategoryChip
            label="All"
            count={totalCount}
            active={activeCategory === "__all__"}
            onClick={() => onPickCategory("__all__")}
          />
          {categories.map((c) => (
            <CategoryChip
              key={c.name}
              label={c.name}
              count={c.count}
              active={activeCategory === c.name}
              onClick={() => onPickCategory(c.name)}
            />
          ))}
        </div>

        {showFeatured && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Featured templates
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featured.map((tpl) => (
                <FeaturedBanner
                  key={String(tpl._id)}
                  tpl={tpl}
                  onSelect={() => onSelect(String(tpl._id))}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {search ? "Results" : activeCategory === "__all__" ? "All templates" : activeCategory}
            </div>
            <div className="text-[11px] text-muted-foreground tabular-nums">
              {filtered.length} {filtered.length === 1 ? "template" : "templates"}
            </div>
          </div>

          {list === undefined && (
            <div className="text-sm text-muted-foreground text-center py-12">
              Loading templates…
            </div>
          )}
          {list && filtered.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-12">
              {search ? "No templates match your search." : "No templates in this category."}
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
      </div>
    </div>
  );
}
