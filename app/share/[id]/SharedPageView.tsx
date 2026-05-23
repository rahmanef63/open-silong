import Link from "next/link";
import katex from "katex";
import "katex/dist/katex.min.css";
import { renderInline } from "@/shared/lib/inlineMd";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { ShareThemeBoot } from "./ShareThemeBoot";
import { HashScroll } from "./HashScroll";

type Block = {
  id: string;
  type: string;
  text?: string;
  checked?: boolean;
  children?: Block[];
  collapsed?: boolean;
  url?: string;
  caption?: string;
  width?: number;
  align?: "left" | "center" | "right";
  columns?: Block[][];
  colWidths?: number[];
  tableRows?: string[][];
  tableHeader?: boolean;
  lang?: string;
};

type SharedPage = {
  _id: string;
  title: string;
  icon: string;
  cover: string | null;
  blocks: Block[];
  font?: string;
  smallText?: boolean;
  fullWidth?: boolean;
  updatedAt: number;
};

export function SharedPageView({ page }: { page: SharedPage }) {
  return (
    <div className="min-h-screen bg-surface print:bg-background">
      <ShareThemeBoot />
      <header className="border-b border-border bg-background/80 backdrop-blur px-6 h-12 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-xs uppercase tracking-wider font-semibold">Shared via Silong</span>
        </div>
        <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
          Open in workspace →
        </Link>
      </header>
      {page.cover && <div className="h-44 md:h-56 w-full" style={{ background: page.cover }} />}
      <article className={`mx-auto ${page.fullWidth ? "max-w-5xl" : "max-w-3xl"} px-6 md:px-12 ${page.cover ? "-mt-10" : "pt-16"}`}>
        <div className="mb-2 text-6xl"><DynamicIcon value={page.icon} /></div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-serif mb-6">
          {page.title || "Untitled"}
        </h1>
        <div className={`prose-editor space-y-2 pb-32 ${page.smallText ? "text-sm" : ""}`}>
          {page.blocks.map((b) => (
            <div key={b.id} id={`block-${b.id}`} className="scroll-mt-16">
              <ReadBlock block={b} />
            </div>
          ))}
        </div>
        <HashScroll />
      </article>
    </div>
  );
}

function ReadBlock({ block }: { block: Block }) {
  const text = block.text ?? "";
  switch (block.type) {
    case "h1":
      return <h1 className="text-3xl font-bold font-serif tracking-tight py-1">{renderInline(text)}</h1>;
    case "h2":
      return <h2 className="text-2xl font-semibold font-serif tracking-tight py-1">{renderInline(text)}</h2>;
    case "h3":
      return <h3 className="text-xl font-semibold tracking-tight py-0.5">{renderInline(text)}</h3>;
    case "todo":
      return (
        <div className="flex items-start gap-2 py-1">
          <input type="checkbox" disabled checked={!!block.checked} className="mt-1.5" />
          <span className={block.checked ? "line-through text-muted-foreground" : ""}>{renderInline(text)}</span>
        </div>
      );
    case "bullet":
      return (
        <div className="flex items-start gap-2 py-1">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
          <span>{renderInline(text)}</span>
        </div>
      );
    case "numbered":
      return (
        <div className="flex items-start gap-2 py-1">
          <span className="text-muted-foreground">•</span>
          <span>{renderInline(text)}</span>
        </div>
      );
    case "quote":
      return (
        <blockquote className="border-l-4 border-foreground/40 pl-4 italic text-foreground/80 py-1">
          {renderInline(text)}
        </blockquote>
      );
    case "code":
      return (
        <pre className="rounded-md bg-muted/70 border border-border p-3 font-mono text-sm whitespace-pre-wrap">
          {text}
        </pre>
      );
    case "callout":
      return (
        <div className="flex items-start gap-3 rounded-md bg-brand/10 border border-brand/20 p-3">
          <span>💡</span>
          <span>{renderInline(text)}</span>
        </div>
      );
    case "divider":
      return <hr className="border-border my-4" />;
    case "page":
      return (
        <div className="rounded-md border border-border bg-card px-3 py-2 text-sm">
          📄 {text || "Linked page"}
        </div>
      );
    case "database":
      return (
        <div className="rounded-md border border-dashed border-border bg-card px-3 py-6 text-center text-sm text-muted-foreground">
          Embedded database (open in workspace to view)
        </div>
      );
    case "image": {
      if (!block.url) return null;
      const widthStyle = block.width ? { width: `${block.width}%` } : undefined;
      const alignCls =
        block.align === "left" ? "mr-auto" :
        block.align === "right" ? "ml-auto" : "mx-auto";
      // External user-pasted urls — keep as <img> with referrerpolicy
      // tightening; CSP img-src already enforced at the edge.
      return (
        <figure className="py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.url}
            alt={block.caption ?? ""}
            style={widthStyle}
            className={`block rounded-md border border-border ${alignCls}`}
            referrerPolicy="no-referrer"
            loading="lazy"
          />
          {block.caption && (
            <figcaption className="mt-1 text-center text-xs text-muted-foreground">
              {renderInline(block.caption)}
            </figcaption>
          )}
        </figure>
      );
    }
    case "equation": {
      const html = katex.renderToString(text || "", {
        throwOnError: false,
        displayMode: true,
      });
      return <div className="py-2" dangerouslySetInnerHTML={{ __html: html }} />;
    }
    case "embed": {
      if (!block.url) return null;
      return (
        <div className="aspect-video w-full overflow-hidden rounded-md border border-border bg-muted/40">
          <iframe
            src={block.url}
            title={block.caption ?? "Embed"}
            className="h-full w-full"
            sandbox="allow-scripts allow-same-origin allow-popups"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      );
    }
    case "table": {
      const rows = block.tableRows ?? [];
      if (!rows.length) return null;
      const [head, ...body] = block.tableHeader ? [rows[0], ...rows.slice(1)] : [null, ...rows];
      return (
        <div className="overflow-x-auto py-2">
          <table className="min-w-full border-collapse text-sm">
            {head && (
              <thead>
                <tr>
                  {head.map((c, i) => (
                    <th key={i} className="border border-border bg-muted/40 px-2 py-1 text-left font-semibold">
                      {renderInline(c)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {body.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className="border border-border px-2 py-1">
                      {renderInline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "toggle":
      return (
        <details className="rounded-md py-1">
          <summary className="cursor-pointer select-none font-medium hover:bg-accent rounded px-1">
            {renderInline(text || "Toggle")}
          </summary>
          <div className="ml-5 mt-1 space-y-1 border-l border-border pl-3">
            {(block.children ?? []).map((c) => (
              <ReadBlock key={c.id} block={c} />
            ))}
          </div>
        </details>
      );
    case "columns2":
    case "columns3": {
      const cols = block.columns ?? [];
      const widths = block.colWidths ?? [];
      return (
        <div className="grid gap-4 py-2" style={{ gridTemplateColumns: gridTemplate(cols.length, widths) }}>
          {cols.map((col, i) => (
            <div key={i} className="space-y-2">
              {col.map((c) => <ReadBlock key={c.id} block={c} />)}
            </div>
          ))}
        </div>
      );
    }
    case "button":
      return block.url ? (
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex items-center rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground hover:bg-brand/90"
        >
          {text || "Open"}
        </a>
      ) : null;
    default:
      return <p className="leading-7 py-0.5 whitespace-pre-wrap">{renderInline(text)}</p>;
  }
}

function gridTemplate(cols: number, widths: number[]): string {
  if (widths.length === cols && widths.every((w) => w > 0)) {
    return widths.map((w) => `${w}fr`).join(" ");
  }
  return Array(cols).fill("1fr").join(" ");
}
