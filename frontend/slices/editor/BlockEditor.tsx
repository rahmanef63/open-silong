import { memo, useRef, useState, useCallback } from "react";
import { useNavigate } from "@/shared/lib/router";
import { ROUTES } from "@/shared/lib/routes";
import { Block, BlockType } from "@/shared/types/domain";
import { useEditorWriters } from "@/slices/editor/lib/useEditorAdapter";
import { useNotionAdapter } from "@/slices/notion";
import { SlashMenu } from "./SlashMenu";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useBlockHistory } from "@/shared/hooks/useBlockHistory";
import { useEditorComponents } from "./lib/componentsRegistry";
import { BlockShell } from "./blocks/BlockShell";
import { BlockControls } from "./blocks/BlockControls";
import { BlockBody } from "./blocks/BlockBody";
import { DatabasePicker } from "./blocks/DatabasePicker";
import { ToggleBlock } from "./blocks/ToggleBlock";
import { SyncedBlockContent } from "./blocks/SyncedBlock";
import { getBlockRenderer } from "./blocks/registry";
// Side-effect import: NestedBlock self-registers into nestedRegistry on
// module load. Without this, columns / toggle blocks render with
// `nestedRegistry.Nested = undefined` (React error #130). Late-binding
// registry pattern intentionally avoids direct mutual imports.
import "./blocks/NestedBlock";
import { useBlockDecorate } from "./block-editor/useBlockDecorate";
import { runSlashSelect } from "./block-editor/slashHandler";
import { handleBlockKeyDown } from "./block-editor/keyboardHandler";
import { handleBlockInput } from "./block-editor/inputHandler";
import { handleMarkdownPaste } from "./block-editor/pasteHandler";
import { PageRefBlock } from "./block-editor/PageRefBlock";

interface Props {
  pageId: string;
  block: Block;
  index: number;
  total: number;
  focusByOffset: (blockId: string, delta: number) => void;
  registerRef: (id: string, el: HTMLElement | null) => void;
  /** 1-based ordinal for numbered list rendering — computed at the
   *  page level so consecutive numbered blocks at the same indent
   *  get sequential labels. */
  ordinal?: number;
}

function BlockEditorBase({ pageId, block, index, total, focusByOffset, registerRef, ordinal }: Props) {
  // useEditorWriters returns ONLY mutation methods — refs stable across
  // pages/databases array changes. Big win on pages with many blocks:
  // typing into one block doesn't invalidate the API in 200 sibling
  // BlockEditor instances. The legacy useEditorAdapter (full reads +
  // writes) is still fine for PageEditor / other top-level surfaces.
  const {
    updateBlock, addBlock, deleteBlock, setBlockType, duplicateBlock,
    createPage, createDatabase, replaceBlock, updatePage,
  } = useEditorWriters();
  const insertBlocksAfter = useNotionAdapter().pages.insertBlocksAfter;
  // getPage was used in onSlashSelect for "/page" auto-link context.
  // slashHandler treats getPage as optional with a fallback path, so
  // we drop the eager pages-list subscription here — minor UX
  // (no contextual page-ref suggestion in slash menu) for major perf
  // (no per-block re-subscription to the entire workspace pages list).
  const getPage = undefined;
  // Render-prop seam: the mounted <NotionAppProvider> supplies the
  // bundled DatabaseBlock from @/slices/databases. Consumers can
  // override via <NotionAppProvider components={{ DatabaseBlock }}>.
  // Phase 4 strip: the editor slice itself no longer imports the
  // databases slice — the registry IS the dep boundary.
  const { DatabaseBlock } = useEditorComponents();
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [askOpen, setAskOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLElement | null>(null);
  const composingRef = useRef(false);
  const history = useBlockHistory(block.text);

  // Make `@`-mention / link spans (data-href) clickable inside the editor:
  // plain click navigates; text-selection is left alone for editing.
  const onContentClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-href]");
      if (!el) return;
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) return;
      const href = el.dataset.href;
      if (!href) return;
      const internal = href.match(/^\/(?:dashboard\/)?p\/([A-Za-z0-9_-]+)/);
      if (internal) {
        e.preventDefault();
        navigate(ROUTES.page(internal[1]));
      } else if (/^https?:\/\//i.test(href)) {
        e.preventDefault();
        window.open(href, "_blank", "noopener,noreferrer");
      }
    },
    [navigate],
  );

  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: block.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  useBlockDecorate(ref, block, composingRef);

  const setRef = (el: HTMLElement | null) => {
    ref.current = el;
    registerRef(block.id, el);
  };

  const handleInput = (e: React.FormEvent<HTMLElement>) =>
    handleBlockInput(e, {
      pageId, block, history, composingRef,
      setBlockType, updateBlock, setSlashOpen, setSlashQuery,
    });

  const convertTo = useCallback((type: BlockType) => {
    setBlockType(pageId, block.id, type);
  }, [pageId, block.id, setBlockType]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) =>
    handleBlockKeyDown(e, {
      pageId, block, index, total, slashOpen, history, setAskOpen,
      convertTo, duplicateBlock, addBlock, deleteBlock, setBlockType, updateBlock, focusByOffset,
    });

  const handlePaste = (e: React.ClipboardEvent<HTMLElement>) =>
    handleMarkdownPaste(e, { pageId, block, insertBlocksAfter });

  const onSlashSelect = (type: BlockType) => {
    setSlashOpen(false);
    return runSlashSelect(type, {
      pageId, block, createPage, createDatabase, setBlockType, updateBlock,
      addBlock, updatePage, getPage,
    });
  };

  const shellProps = {
    setNodeRef, style, isDragging, isOver, blockId: block.id, attributes, listeners,
  } as const;
  const controls = (
    <BlockControls pageId={pageId} block={block} index={index} listeners={listeners} convertTo={convertTo} askOpen={askOpen} onAskOpenChange={setAskOpen} />
  );

  // ----- Special block types render their own UI -----
  if (block.type === "page") {
    return (
      <BlockShell {...shellProps} controls={controls}>
        <PageRefBlock block={block} />
      </BlockShell>
    );
  }

  if (block.type === "database") {
    return (
      <BlockShell {...shellProps} controls={controls}>
        {DatabaseBlock ? (
          <DatabaseBlock pageId={pageId} block={block} />
        ) : (
          <div className="rounded border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            DatabaseBlock not registered — wrap your app in{" "}
            <code>&lt;NotionAppProvider&gt;</code> from{" "}
            <code>@/slices/notion</code> to mount the bundled database
            renderer (or pass a custom one via the{" "}
            <code>components</code> prop).
          </div>
        )}
      </BlockShell>
    );
  }

  // Legacy `columns2..5` blocks are flattened into the new layout
  // primitive by adaptPageLayouts() before they reach BlockEditor, so
  // we never receive one here directly. Kept in BlockType for back-
  // compat reads of pages that haven't been adapted yet.

  if (block.type === "toggle") {
    return (
      <ToggleBlock
        pageId={pageId} block={block} index={index}
        setNodeRef={setNodeRef} style={style} isDragging={isDragging} isOver={isOver}
        attributes={attributes} listeners={listeners} convertTo={convertTo}
      />
    );
  }

  if (block.type === "synced") {
    return (
      <BlockShell {...shellProps} controls={controls}>
        <SyncedBlockContent
          block={block}
          pageId={pageId}
          onUpdate={(patch) => updateBlock(pageId, block.id, patch)}
        />
      </BlockShell>
    );
  }

  const Renderer = getBlockRenderer(block.type);
  if (Renderer) {
    return (
      <BlockShell {...shellProps} controls={controls}>
        <Renderer
          block={block}
          pageId={pageId}
          onUpdate={(patch) => updateBlock(pageId, block.id, patch)}
          onReplace={(next) => replaceBlock(pageId, block.id, next)}
          registerRef={(el) => registerRef(block.id, el)}
        />
      </BlockShell>
    );
  }

  return (
    <BlockShell {...shellProps} controls={controls}>
      <BlockBody
        block={block}
        setRef={setRef}
        handleInput={handleInput}
        handleKeyDown={handleKeyDown}
        handlePaste={handlePaste}
        onContentClick={onContentClick}
        ordinal={ordinal}
        onCheck={(c) => updateBlock(pageId, block.id, { checked: c })}
        onLang={(lang) => updateBlock(pageId, block.id, { lang })}
      />
      {slashOpen && (
        <div className="absolute z-50 mt-1 left-7">
          <SlashMenu
            query={slashQuery}
            onSelect={onSlashSelect}
            onClose={() => setSlashOpen(false)}
            onSelectLinkedDatabase={() => {
              setSlashOpen(false);
              setPickerOpen(true);
            }}
            onSelectFullPageDatabase={async () => {
              setSlashOpen(false);
              const db = await createDatabase("Untitled database");
              if (db?.id) navigate(ROUTES.database(db.id));
            }}
          />
        </div>
      )}
      <DatabasePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(databaseId) => {
          setBlockType(pageId, block.id, "database");
          updateBlock(pageId, block.id, { text: "", databaseId });
        }}
      />
    </BlockShell>
  );
}

export const BlockEditor = memo(BlockEditorBase);
