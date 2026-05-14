import { cn } from "@/shared/lib/utils";
import { CategoryRow } from "./parts";

export function CategorySidebar({
  totalCount,
  categories,
  activeCategory,
  onPick,
  mobilePreviewOpen,
}: {
  totalCount: number;
  categories: { name: string; count: number }[];
  activeCategory: string;
  onPick: (name: string) => void;
  mobilePreviewOpen: boolean;
}) {
  return (
    <aside
      className={cn(
        "shrink-0 border-b md:border-b-0 md:border-r border-border bg-muted/20",
        // Desktop layout = 1/6 of dialog width (sidebar : list : preview = 1 : 1 : 4)
        "md:w-1/6 md:min-w-[160px] md:max-w-[220px] md:flex-col md:flex md:overflow-y-auto md:scrollbar-thin",
        mobilePreviewOpen ? "hidden md:flex" : "flex flex-col",
      )}
    >
      <div className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Categories
      </div>
      <nav className="md:flex md:flex-col gap-0.5 px-2 pb-2 flex overflow-x-auto md:overflow-x-visible scrollbar-thin">
        <CategoryRow
          label="All"
          count={totalCount}
          active={activeCategory === "__all__"}
          onClick={() => onPick("__all__")}
        />
        {categories.map((c) => (
          <CategoryRow
            key={c.name}
            label={c.name}
            count={c.count}
            active={activeCategory === c.name}
            onClick={() => onPick(c.name)}
          />
        ))}
      </nav>
    </aside>
  );
}
