"use client";

import { Database as DatabaseIcon, ChevronRight } from "lucide-react";
import { renderInline } from "@/shared/lib/inlineMd";
import { DynamicIcon } from "@/slices/icon-picker";

/** Render a template's root page (plus child pages) like an actual page
 *  would look — used by the admin preview dialog so reviewers don't have
 *  to imagine the output from JSON or a structure tree. Supports the
 *  block types the editor renders today; unknown types show a stub chip. */
export function TemplatePagePreview({ json }: { json: unknown }) {
  const j = json as { page?: TemplatePage };
  if (!j?.page) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground italic">
        Template has no root page.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <PageRender page={j.page} depth={0} />
    </div>
  );
}

interface TemplatePage {
  ref?: string;
  title?: string;
  icon?: string;
  blocks?: TemplateBlock[];
  databases?: TemplateDb[];
  children?: TemplatePage[];
}
interface TemplateBlock {
  type: string;
  text?: string;
  checked?: boolean;
  lang?: string;
  icon?: string;
  url?: string;
  caption?: string;
  databaseRef?: string;
  children?: TemplateBlock[];
}
interface TemplateDb {
  ref?: string;
  name?: string;
  icon?: string;
  properties?: { id?: string; name: string; type: string }[];
  seedRows?: Record<string, unknown>[];
}

function PageRender({ page, depth }: { page: TemplatePage; depth: number }) {
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

function BlockRender({ b, databases }: { b: TemplateBlock; databases: TemplateDb[] }) {
  switch (b.type) {
    case "h1":
      return <h2 className="text-2xl font-bold mt-3 mb-1 tracking-tight">{renderInlineOrPlaceholder(b.text)}</h2>;
    case "h2":
      return <h3 className="text-xl font-semibold mt-3 mb-1">{renderInlineOrPlaceholder(b.text)}</h3>;
    case "h3":
      return <h4 className="text-base font-semibold mt-2 mb-1">{renderInlineOrPlaceholder(b.text)}</h4>;
    case "paragraph":
      return <p>{renderInlineOrPlaceholder(b.text)}</p>;
    case "todo":
      return (
        <div className="flex items-start gap-2">
          <input type="checkbox" checked={!!b.checked} readOnly className="mt-1" />
          <span className={b.checked ? "line-through text-muted-foreground" : ""}>
            {renderInlineOrPlaceholder(b.text)}
          </span>
        </div>
      );
    case "quote":
      return (
        <blockquote className="border-l-2 border-foreground/30 pl-3 py-0.5 italic text-muted-foreground">
          {renderInlineOrPlaceholder(b.text)}
        </blockquote>
      );
    case "code":
      return (
        <pre className="rounded-md border border-border bg-muted/30 p-3 text-xs font-mono overflow-x-auto">
          {b.lang ? (
            <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{b.lang}</div>
          ) : null}
          <code>{b.text ?? ""}</code>
        </pre>
      );
    case "divider":
      return <hr className="border-border my-2" />;
    case "callout":
      return (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 flex gap-2 items-start">
          <span className="text-base shrink-0">{b.icon ?? "💡"}</span>
          <div className="flex-1">{renderInlineOrPlaceholder(b.text)}</div>
        </div>
      );
    case "toggle":
      return (
        <details className="rounded-md border border-border bg-muted/10 px-3 py-1.5">
          <summary className="cursor-pointer text-sm font-medium">
            {renderInlineOrPlaceholder(b.text)}
          </summary>
          {b.children && b.children.length > 0 && (
            <div className="mt-1.5 pl-2 border-l border-border space-y-1">
              {b.children.map((c, i) => (
                <BlockRender key={i} b={c} databases={databases} />
              ))}
            </div>
          )}
        </details>
      );
    case "image":
      return b.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={b.url} alt={b.caption ?? ""} className="rounded-md border border-border max-h-72 object-contain" />
      ) : (
        <BlockStub type="image" />
      );
    case "database": {
      const db = databases.find((d) => d.ref === b.databaseRef);
      return <DatabaseStub db={db} databaseRef={b.databaseRef} />;
    }
    case "page_link":
      return (
        <a className="text-brand underline text-sm" href="#">
          {renderInlineOrPlaceholder(b.text) ?? "Linked page"}
        </a>
      );
    default:
      return <BlockStub type={b.type} text={b.text} />;
  }
}

function BlockStub({ type, text }: { type: string; text?: string }) {
  return (
    <div className="text-xs text-muted-foreground/80 italic rounded border border-dashed border-border bg-muted/10 px-2 py-1 inline-flex items-center gap-1.5">
      <span className="font-mono not-italic">[{type}]</span>
      {text && <span className="truncate max-w-[260px]">{text}</span>}
    </div>
  );
}

function DatabaseStub({ db, databaseRef }: { db: TemplateDb | undefined; databaseRef?: string }) {
  if (!db) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/10 px-3 py-2 text-xs text-muted-foreground italic flex items-center gap-2">
        <DatabaseIcon className="h-3.5 w-3.5" />
        Database reference: {databaseRef ?? "?"} (not defined on this page)
      </div>
    );
  }
  const props = db.properties ?? [];
  const rows = db.seedRows ?? [];
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2 text-sm bg-muted/30">
        <span className="text-base">{db.icon ?? "📊"}</span>
        <span className="font-medium truncate">{db.name ?? "Database"}</span>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {props.length} props · {rows.length} rows
        </span>
      </div>
      {props.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/20">
              <tr>
                {props.map((p, i) => (
                  <th key={i} className="text-left font-medium px-3 py-1.5 border-b border-border whitespace-nowrap">
                    {p.name}
                    <span className="ml-1 text-[10px] uppercase text-muted-foreground/70">{p.type}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((row, ri) => (
                <tr key={ri} className="border-b border-border/60">
                  {props.map((p, pi) => {
                    const v = row[p.id ?? p.name];
                    return (
                      <td key={pi} className="px-3 py-1.5 align-top text-muted-foreground">
                        {formatCell(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={props.length}
                    className="px-3 py-3 text-center text-[11px] text-muted-foreground italic"
                  >
                    No seed rows
                  </td>
                </tr>
              )}
              {rows.length > 5 && (
                <tr>
                  <td
                    colSpan={props.length}
                    className="px-3 py-1.5 text-center text-[11px] text-muted-foreground"
                  >
                    +{rows.length - 5} more rows
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-3 py-3 text-xs text-muted-foreground italic">No properties defined.</div>
      )}
    </div>
  );
}

function formatCell(v: unknown): React.ReactNode {
  if (v === null || v === undefined || v === "") return <span className="text-muted-foreground/40">—</span>;
  if (typeof v === "boolean") return v ? "✓" : "—";
  if (typeof v === "number") return v.toLocaleString();
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return <code className="font-mono text-[10px]">{JSON.stringify(v)}</code>;
  return String(v);
}

function renderInlineOrPlaceholder(text: string | undefined): React.ReactNode {
  if (!text || !text.trim()) {
    return <span className="text-muted-foreground/40 italic">(empty)</span>;
  }
  return renderInline(text);
}
