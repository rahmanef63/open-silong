import type { TemplateBlock, TemplateDb } from "./types";
import { renderInlineOrPlaceholder } from "./inline";
import { DatabaseStub } from "./DatabaseStub";

export function BlockStub({ type, text }: { type: string; text?: string }) {
  return (
    <div className="text-xs text-muted-foreground/80 italic rounded border border-dashed border-border bg-muted/10 px-2 py-1 inline-flex items-center gap-1.5">
      <span className="font-mono not-italic">[{type}]</span>
      {text && <span className="truncate max-w-[260px]">{text}</span>}
    </div>
  );
}

export function BlockRender({ b, databases }: { b: TemplateBlock; databases: TemplateDb[] }) {
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
