import { useMemo, useState } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { RefreshCw, Plus, Link2, AlertTriangle, Copy, Check } from "lucide-react";
import type { Block, BlockType } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import { uid } from "@/shared/lib/uid";
import { findSyncedSource } from "../lib/syncedBlocks";
import { requireNested } from "./nestedRegistry";
import { bgColorClass } from "../lib/colors";

/** Synced block — Notion-canonical reusable content.
 *
 *  Two modes (driven by `block.syncRef`):
 *  - **Source** (`!syncRef`): owns `children` directly. Edits propagate
 *    to every reference because refs read children via the source block
 *    at render time.
 *  - **Reference** (`syncRef === true`): mirrors a source block by
 *    `syncId` lookup across all pages in the workspace. Renders the
 *    source's children READ-ONLY. Edits must happen at the source.
 *
 *  Both modes share `syncId` (the group key). Source = first block
 *  created with `syncId`; refs are explicitly opted-in via
 *  `syncRef: true`.
 */
export function SyncedBlockContent({
  block, pageId, onUpdate,
}: {
  block: Block;
  pageId?: string;
  onUpdate: (patch: Partial<Block>) => void;
}) {
  const { pages } = useStore();
  const isRef = !!block.syncRef;
  const sourceLookup = useMemo(
    () => (isRef && block.syncId ? findSyncedSource(block.syncId, pages, block.id) : null),
    [isRef, block.syncId, block.id, pages],
  );
  const sourcePage = sourceLookup?.page ?? null;
  const sourceBlock = sourceLookup?.block ?? null;

  if (isRef) {
    return (
      <SyncedRefView block={block} sourcePage={sourcePage} sourceBlock={sourceBlock} />
    );
  }

  return <SyncedSourceView block={block} pageId={pageId} onUpdate={onUpdate} />;
}

/** Source mode — owns children, editable, copy-link affordance. */
function SyncedSourceView({
  block, pageId, onUpdate,
}: {
  block: Block;
  pageId?: string;
  onUpdate: (patch: Partial<Block>) => void;
}) {
  const children: Block[] = block.children ?? [];
  const setChildren = (next: Block[]) => onUpdate({ children: next });
  const [copied, setCopied] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [pasteValue, setPasteValue] = useState("");

  const convertToRef = () => {
    const v = pasteValue.trim();
    const m = v.match(/^(?:nosion:\/\/sync\/)?([a-z0-9]{6,})$/i);
    if (!m) return;
    const targetSyncId = m[1];
    if (targetSyncId === block.syncId) {
      setPasteValue("");
      return;
    }
    onUpdate({ syncId: targetSyncId, syncRef: true, children: undefined });
    setPasting(false);
    setPasteValue("");
  };

  const addChild = () => {
    const nb: Block = { id: uid(), type: "paragraph", text: "" };
    setChildren([...children, nb]);
    setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${nb.id}"]`)?.focus(), 30);
  };

  const copyLink = async () => {
    if (!block.syncId) return;
    try {
      await navigator.clipboard.writeText(`nosion://sync/${block.syncId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — fall through silently.
    }
  };

  return (
    <div className={cn("rounded-md border border-brand/30 bg-brand/5 p-2", bgColorClass(block.bgColor))}>
      <div className="flex items-center gap-2 px-1 pb-1.5 mb-1.5 border-b border-brand/20 text-[10px] font-medium text-brand/80 uppercase tracking-wider">
        <RefreshCw className="h-3 w-3" />
        <span>Synced — original</span>
        <span className="ml-auto inline-flex items-center gap-2">
          <code className="rounded bg-card/60 px-1 py-0.5 font-mono text-[9px] normal-case tracking-normal">{block.syncId?.slice(0, 8)}</code>
          <button
            onClick={copyLink}
            title="Copy sync link — paste anywhere as a synced reference"
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-card/60 normal-case"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy link"}
          </button>
        </span>
      </div>
      <SyncedChildrenList children={children} setChildren={setChildren} pageId={pageId} editable />
      <div className="mt-1 flex items-center gap-3">
        <button
          onClick={addChild}
          className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground"
        >
          <Plus className="h-3 w-3" /> Add inside synced block
        </button>
        {children.length === 0 && !pasting && (
          <button
            onClick={() => setPasting(true)}
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground"
          >
            …or paste a sync link to mirror existing content
          </button>
        )}
        {pasting && (
          <form
            onSubmit={(e) => { e.preventDefault(); convertToRef(); }}
            className="flex items-center gap-1"
          >
            <input
              autoFocus
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
              placeholder="nosion://sync/<id>"
              className="rounded border border-border bg-background px-2 py-0.5 text-xs outline-none focus:border-brand"
            />
            <button type="submit" className="rounded bg-brand text-white px-2 py-0.5 text-xs">Mirror</button>
            <button type="button" onClick={() => { setPasting(false); setPasteValue(""); }} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          </form>
        )}
      </div>
    </div>
  );
}

/** Ref mode — read-only mirror of source block's children. */
function SyncedRefView({
  block, sourcePage, sourceBlock,
}: {
  block: Block;
  sourcePage: { id: string; title: string } | null;
  sourceBlock: Block | null;
}) {
  if (!sourceBlock) {
    return (
      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <div>
          <div className="font-medium">Synced source not found.</div>
          <div className="text-[10px] mt-0.5 opacity-80">
            sync id <code className="font-mono">{block.syncId?.slice(0, 8) ?? "—"}</code> — the original may have been deleted or moved to a workspace you can&rsquo;t see.
          </div>
        </div>
      </div>
    );
  }

  const children: Block[] = sourceBlock.children ?? [];

  return (
    <div className={cn("rounded-md border border-brand/30 bg-brand/5 p-2", bgColorClass(block.bgColor))}>
      <div className="flex items-center gap-2 px-1 pb-1.5 mb-1.5 border-b border-brand/20 text-[10px] font-medium text-brand/80 uppercase tracking-wider">
        <RefreshCw className="h-3 w-3" />
        <span>Synced from</span>
        {sourcePage && (
          <a
            href={`/dashboard/p/${sourcePage.id}`}
            className="inline-flex items-center gap-1 normal-case font-normal text-brand hover:underline"
          >
            <Link2 className="h-3 w-3" />
            {sourcePage.title || "Untitled"}
          </a>
        )}
        <span className="ml-auto text-[9px] opacity-70 normal-case">read-only here · edit at source</span>
      </div>
      <div className="opacity-90 pointer-events-none select-text" aria-readonly>
        <SyncedChildrenList children={children} setChildren={() => {}} pageId={undefined} editable={false} />
      </div>
    </div>
  );
}

/** Renders a list of nested blocks. When `editable=false`, click events
 *  fall through but mutations from NestedBlock are no-ops. */
function SyncedChildrenList({
  children, setChildren, pageId, editable,
}: {
  children: Block[];
  setChildren: (next: Block[]) => void;
  pageId?: string;
  editable: boolean;
}) {
  const NestedBlock = requireNested();
  return (
    <SortableContext items={children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
      <div className="space-y-0.5">
        {children.map((child, ci) => (
          <NestedBlock
            key={child.id}
            block={child}
            depth={1}
            pageId={pageId}
            onUpdate={(patch: Partial<Block>) => {
              if (!editable) return;
              setChildren(children.map((c, j) => (j === ci ? { ...c, ...patch } : c)));
            }}
            onDelete={() => {
              if (!editable) return;
              setChildren(children.filter((_, j) => j !== ci));
            }}
            onAddAfter={(type: BlockType) => {
              if (!editable) return;
              const nb: Block = { id: uid(), type: type ?? "paragraph", text: "" };
              const nc = [...children];
              nc.splice(ci + 1, 0, nb);
              setChildren(nc);
              setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${nb.id}"]`)?.focus(), 30);
            }}
            onFocusNext={() => {
              const next = children[ci + 1];
              if (next) document.querySelector<HTMLElement>(`[data-block-id="${next.id}"]`)?.focus();
            }}
            onFocusPrev={() => {
              const prev = children[ci - 1];
              if (prev) document.querySelector<HTMLElement>(`[data-block-id="${prev.id}"]`)?.focus();
            }}
          />
        ))}
      </div>
    </SortableContext>
  );
}
