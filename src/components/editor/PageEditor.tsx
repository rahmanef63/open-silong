import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Page } from "@/lib/types";
import { BlockEditor } from "./BlockEditor";
import { ChevronRight, Star, MoreHorizontal, ImagePlus, Smile, Trash2, Copy, FileText } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const ICONS = ["📄", "📝", "📚", "🚀", "🌱", "🛰️", "🎨", "🧠", "🪄", "🌙", "☕", "🔥", "🌊", "✨", "🪐", "🛠️"];
const COVERS = [
  "linear-gradient(135deg, hsl(24 90% 70%), hsl(340 80% 70%))",
  "linear-gradient(135deg, hsl(200 80% 70%), hsl(260 70% 70%))",
  "linear-gradient(135deg, hsl(140 50% 70%), hsl(180 60% 70%))",
  "linear-gradient(135deg, hsl(40 90% 75%), hsl(20 80% 65%))",
  "linear-gradient(135deg, hsl(260 70% 70%), hsl(320 70% 75%))",
];

export function PageEditor() {
  const { id } = useParams<{ id: string }>();
  const { getPage, updatePage, pushRecent, toggleFavorite, duplicatePage, deletePage, addBlock, moveBlock } = useStore();
  const navigate = useNavigate();
  const page = id ? getPage(id) : undefined;
  const [iconPick, setIconPick] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const refs = useRef<Map<string, HTMLElement | null>>(new Map());

  useEffect(() => { if (id && page) pushRecent(id); }, [id]);

  if (!page || page.trashed) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🕊️</div>
          <h2 className="text-xl font-semibold mb-2">Page not found</h2>
          <p className="text-muted-foreground text-sm mb-6">This page may have been moved or deleted.</p>
          <button onClick={() => navigate("/")} className="rounded-md bg-foreground text-background px-4 py-2 text-sm hover:opacity-90">Back home</button>
        </div>
      </div>
    );
  }

  const registerRef = (id: string, el: HTMLElement | null) => { refs.current.set(id, el); };
  const focusBlock = (idx: number) => {
    const b = page.blocks[idx];
    if (!b) return;
    const el = refs.current.get(b.id);
    el?.focus();
  };

  const dragHandlers = {
    draggingIdx, overIdx,
    onDragStart: (i: number) => setDraggingIdx(i),
    onDragOver: (i: number) => setOverIdx(i),
    onDrop: (i: number) => {
      if (draggingIdx !== null && draggingIdx !== i) moveBlock(page.id, draggingIdx, i);
      setDraggingIdx(null); setOverIdx(null);
    },
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header page={page} />

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {page.cover && (
          <div className="h-44 md:h-56 w-full" style={{ background: page.cover }} />
        )}

        <div className={cn("mx-auto max-w-3xl px-6 md:px-12", page.cover ? "-mt-10" : "pt-16")}>
          <div className="relative">
            <button
              onClick={() => setIconPick(v => !v)}
              className="text-6xl leading-none hover:bg-accent rounded-md p-1 transition"
              aria-label="Change icon"
            >
              {page.icon}
            </button>
            {iconPick && (
              <div className="absolute z-20 mt-2 grid grid-cols-8 gap-1 rounded-lg border border-border bg-popover p-2 shadow-pop">
                {ICONS.map(i => (
                  <button key={i} onClick={() => { updatePage(page.id, { icon: i }); setIconPick(false); }} className="text-xl rounded hover:bg-accent p-1.5">{i}</button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground opacity-0 hover:opacity-100 transition">
            {!page.cover && (
              <button onClick={() => updatePage(page.id, { cover: COVERS[Math.floor(Math.random() * COVERS.length)] })} className="flex items-center gap-1 hover:text-foreground">
                <ImagePlus className="h-3.5 w-3.5" /> Add cover
              </button>
            )}
          </div>

          <input
            value={page.title}
            onChange={e => updatePage(page.id, { title: e.target.value })}
            placeholder="Untitled"
            className="mt-3 w-full bg-transparent text-4xl md:text-5xl font-bold tracking-tight font-serif outline-none placeholder:text-muted-foreground/40"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "ArrowDown") {
                e.preventDefault();
                const first = page.blocks[0];
                if (first) refs.current.get(first.id)?.focus();
              }
            }}
          />

          <div className="mt-6 pb-32 prose-editor">
            {page.blocks.map((b, i) => (
              <BlockEditor
                key={b.id}
                pageId={page.id}
                block={b}
                index={i}
                total={page.blocks.length}
                registerRef={registerRef}
                onFocusNext={() => focusBlock(i + 1)}
                onFocusPrev={() => focusBlock(i - 1)}
                dragHandlers={dragHandlers}
              />
            ))}
            <button
              onClick={() => {
                const newId = addBlock(page.id, page.blocks.length - 1);
                setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${newId}"]`)?.focus(), 0);
              }}
              className="mt-2 text-sm text-muted-foreground hover:text-foreground"
            >
              + Add block
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({ page }: { page: Page }) {
  const { pages, getPage, toggleFavorite, duplicatePage, deletePage, saving } = useStore();
  const navigate = useNavigate();
  const crumbs: Page[] = [];
  let cur: Page | undefined = page;
  while (cur) {
    crumbs.unshift(cur);
    cur = cur.parentId ? getPage(cur.parentId) : undefined;
  }

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-background/80 backdrop-blur px-4 md:px-6 h-12 shrink-0">
      <nav className="flex items-center gap-1 text-sm min-w-0 overflow-hidden">
        {crumbs.map((c, i) => (
          <div key={c.id} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            <button
              onClick={() => navigate(`/p/${c.id}`)}
              className={cn(
                "flex items-center gap-1.5 rounded px-1.5 py-1 hover:bg-accent min-w-0",
                i === crumbs.length - 1 ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span>{c.icon}</span>
              <span className="truncate">{c.title || "Untitled"}</span>
            </button>
          </div>
        ))}
      </nav>
      <div className="flex items-center gap-1 shrink-0">
        <span className={cn("text-xs text-muted-foreground mr-2", saving && "animate-pulse-soft")}>
          {saving ? "Saving…" : "Saved"}
        </span>
        <button
          onClick={() => toggleFavorite(page.id)}
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-accent text-muted-foreground"
          aria-label="Favorite"
        >
          <Star className={cn("h-4 w-4", page.favorite && "fill-brand text-brand")} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 w-8 items-center justify-center rounded hover:bg-accent text-muted-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { const c = duplicatePage(page.id); if (c) navigate(`/p/${c.id}`); }}>
              <Copy className="mr-2 h-4 w-4" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => { deletePage(page.id); navigate("/"); }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Move to trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
