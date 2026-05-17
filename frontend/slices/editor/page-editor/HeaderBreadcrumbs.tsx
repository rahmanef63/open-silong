import * as React from "react";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "@/shared/lib/router";
import { ROUTES } from "@/shared/lib/routes";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { Button } from "@/shared/ui/button";
import type { Page } from "@/shared/types/domain";

export const HeaderBreadcrumbs = React.memo(HeaderBreadcrumbsImpl, (a, b) =>
  a.page.id === b.page.id &&
  a.page.title === b.page.title &&
  a.page.icon === b.page.icon &&
  a.page.parentId === b.page.parentId &&
  a.page.rowOfDatabaseId === b.page.rowOfDatabaseId,
);

function HeaderBreadcrumbsImpl({ page }: { page: Page }) {
  const { getPage, getDatabase } = useStore();
  const navigate = useNavigate();
  const crumbs = React.useMemo(() => {
    const out: Page[] = [];
    let cur: Page | undefined = page;
    while (cur) {
      out.unshift(cur);
      cur = cur.parentId ? getPage(cur.parentId) : undefined;
    }
    return out;
  }, [page, getPage]);

  const parentDb = page.rowOfDatabaseId ? getDatabase(page.rowOfDatabaseId) : null;

  return (
    <nav className="flex items-center gap-1 text-sm min-w-0 overflow-hidden">
      {parentDb && (
        <>
          <Button
            variant="ghost"
            onClick={() => navigate(ROUTES.database(parentDb.id))}
            className="h-auto min-w-0 justify-start gap-1.5 rounded px-1.5 py-1 text-sm font-normal text-muted-foreground"
          >
            <DynamicIcon value={parentDb.icon} className="text-sm" />
            <span className="truncate max-w-[160px]">{parentDb.name || "Untitled database"}</span>
          </Button>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </>
      )}
      {crumbs.map((c, i) => (
        <div key={c.id} className="flex items-center gap-1 min-w-0">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          <Button
            variant="ghost"
            onClick={() => navigate(ROUTES.page(c.id))}
            className={cn(
              "h-auto min-w-0 justify-start gap-1.5 rounded px-1.5 py-1 text-sm font-normal",
              i === crumbs.length - 1 ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <DynamicIcon value={c.icon} className="text-sm" />
            <span className="truncate max-w-[160px]">{c.title || "Untitled"}</span>
          </Button>
        </div>
      ))}
    </nav>
  );
}
