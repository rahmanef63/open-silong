import { useParams, Link } from "react-router-dom";
import { useStore } from "@/shared/lib/store";
import { Block } from "@/shared/types/domain";
import { Lock } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const SharedPage = () => {
  const { id } = useParams<{ id: string }>();
  const { getPage, workspace } = useStore();
  const page = id ? getPage(id) : undefined;

  if (!page || page.trashed || !page.isPublic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-6">
        <div className="max-w-md text-center">
          <div className="flex h-12 w-12 items-center justify-center mx-auto rounded-full bg-muted mb-4"><Lock className="h-5 w-5" /></div>
          <h1 className="text-xl font-bold mb-1">This page is private</h1>
          <p className="text-sm text-muted-foreground mb-4">The page you're looking for is not publicly shared.</p>
          <Link to="/" className="text-sm text-brand hover:underline">Go to workspace</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-background/80 backdrop-blur px-6 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{workspace.emoji}</span><span>{workspace.name}</span>
          <span className="mx-2">·</span>
          <span className="text-xs uppercase tracking-wider font-semibold">Shared</span>
        </div>
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">Open in workspace →</Link>
      </header>
      {page.cover && <div className="h-44 md:h-56 w-full" style={{ background: page.cover }} />}
      <article className={cn("mx-auto max-w-3xl px-6 md:px-12", page.cover ? "-mt-10" : "pt-16")}>
        <div className="text-6xl mb-2">{page.icon}</div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-serif mb-6">{page.title || "Untitled"}</h1>
        <div className="prose-editor space-y-2 pb-32">
          {page.blocks.map(b => <ReadBlock key={b.id} block={b} />)}
        </div>
      </article>
    </div>
  );
};

function ReadBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "h1": return <h1 className="text-3xl font-bold font-serif tracking-tight py-1">{block.text}</h1>;
    case "h2": return <h2 className="text-2xl font-semibold font-serif tracking-tight py-1">{block.text}</h2>;
    case "h3": return <h3 className="text-xl font-semibold tracking-tight py-0.5">{block.text}</h3>;
    case "todo": return <div className="flex items-start gap-2 py-1"><input type="checkbox" disabled checked={!!block.checked} className="mt-1.5" /><span className={block.checked ? "line-through text-muted-foreground" : ""}>{block.text}</span></div>;
    case "bullet": return <div className="flex items-start gap-2 py-1"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" /><span>{block.text}</span></div>;
    case "numbered": return <div className="flex items-start gap-2 py-1"><span className="text-muted-foreground">•</span><span>{block.text}</span></div>;
    case "quote": return <blockquote className="border-l-4 border-foreground/40 pl-4 italic text-foreground/80 py-1">{block.text}</blockquote>;
    case "code": return <pre className="rounded-md bg-muted/70 border border-border p-3 font-mono text-sm whitespace-pre-wrap">{block.text}</pre>;
    case "callout": return <div className="flex items-start gap-3 rounded-md bg-brand/10 border border-brand/20 p-3"><span>💡</span><span>{block.text}</span></div>;
    case "divider": return <hr className="border-border my-4" />;
    case "page": return <div className="rounded-md border border-border bg-card px-3 py-2 text-sm">📄 {block.text || "Linked page"}</div>;
    case "database": return <div className="rounded-md border border-dashed border-border bg-card px-3 py-6 text-center text-sm text-muted-foreground">Embedded database (open in workspace to view)</div>;
    default: return <p className="leading-7 py-0.5 whitespace-pre-wrap">{block.text}</p>;
  }
}

export default SharedPage;
