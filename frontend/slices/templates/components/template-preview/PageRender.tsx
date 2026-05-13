import { ChevronRight } from "lucide-react";
import { DynamicIcon } from "@/shared/components/icon-picker";
import type { TemplatePage, TemplateBlock, TemplateDb } from "./types";
import { renderInlineOrPlaceholder } from "./inline";
import { BlockRender } from "./BlockRender";

function BlocksRender({
  blocks,
  databases,
}: {
  blocks: TemplateBlock[];
  databases: TemplateDb[];
}) {
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.type === "bullet_list_item" || b.type === "numbered_list_item") {
      const isBullet = b.type === "bullet_list_item";
      const group: TemplateBlock[] = [];
      while (i < blocks.length && blocks[i].type === b.type) {
        group.push(blocks[i]);
        i += 1;
      }
      const ListTag = isBullet ? "ul" : "ol";
      out.push(
        <ListTag
          key={`list-${out.length}`}
          className={`${isBullet ? "list-disc" : "list-decimal"} pl-5 space-y-0.5`}
        >
          {group.map((g, gi) => (
            <li key={gi}>{renderInlineOrPlaceholder(g.text)}</li>
          ))}
        </ListTag>,
      );
      continue;
    }
    out.push(<BlockRender key={i} b={b} databases={databases} />);
    i += 1;
  }
  if (out.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic py-1">
        (no blocks on this page)
      </div>
    );
  }
  return <>{out}</>;
}

export function PageRender({ page, depth }: { page: TemplatePage; depth: number }) {
  const top = depth === 0;
  return (
    <div className={top ? "" : "border-t border-border"}>
      <div className={top ? "px-6 pt-6 pb-3" : "px-6 pt-4 pb-2 bg-muted/20"}>
        <div className="flex items-baseline gap-2.5">
          <span className={top ? "text-3xl" : "text-xl"}>
            <DynamicIcon value={page.icon ?? "📄"} />
          </span>
          {top ? (
            <h2 className="text-2xl font-bold tracking-tight">{page.title ?? "Untitled"}</h2>
          ) : (
            <h3 className="text-base font-semibold flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              {page.title ?? "Untitled"}
            </h3>
          )}
        </div>
      </div>
      <div className="px-6 pb-4 space-y-1.5 text-sm leading-relaxed">
        <BlocksRender blocks={page.blocks ?? []} databases={page.databases ?? []} />
      </div>
      {(page.children ?? []).map((c, i) => (
        <PageRender key={i} page={c} depth={depth + 1} />
      ))}
    </div>
  );
}
