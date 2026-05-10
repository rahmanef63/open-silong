import { KeyboardEvent, memo, useEffect, useRef, useState, useCallback } from "react";
import { Block, BlockType } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { FileText } from "lucide-react";
import { SlashMenu } from "./SlashMenu";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useBlockHistory } from "@/shared/hooks/useBlockHistory";
import { useNavigate } from "@/shared/lib/router-compat";
import { DatabaseBlock } from "@/slices/databases/DatabaseBlock";
import { DynamicIcon } from "@/slices/icon-picker";
import { ColumnBlockEditor } from "./ColumnBlockEditor";
import { BlockShell } from "./blocks/BlockShell";
import { BlockControls } from "./blocks/BlockControls";
import { BlockBody } from "./blocks/BlockBody";
import { DatabasePicker } from "./blocks/DatabasePicker";
import { ToggleBlock } from "./blocks/ToggleBlock";
import { getBlockRenderer } from "./blocks/registry";
import { MARKDOWN_TRIGGERS } from "./lib/markdownTriggers";
import { decorateInPlace } from "./lib/inlineDecorator";

// Block types whose BlockBody renders a contentEditable we should
// decorate (skips code/database/page/columns/toggle which own their
// own UI or use mono-font where styling would be wrong).
const DECORATE_TYPES = new Set<BlockType>([
  "paragraph", "h1", "h2", "h3", "h4", "todo", "bullet", "numbered", "quote", "callout",
]);

interface Props {
  pageId: string;
  block: Block;
  index: number;
  total: number;
  focusByOffset: (blockId: string, delta: number) => void;
  registerRef: (id: string, el: HTMLElement | null) => void;
}


function BlockEditorBase({ pageId, block, index, total, focusByOffset, registerRef }: Props) {
  const {
    updateBlock, addBlock, deleteBlock, setBlockType, duplicateBlock,
    createPage, getPage, createDatabase, replaceBlock,
  } = useStore();
  const navigate = useNavigate();
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [askOpen, setAskOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const ref = useRef<HTMLElement | null>(null);
  const composingRef = useRef(false);
  const history = useBlockHistory(block.text);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // While the user is typing in this element, the DOM is the source of truth.
    // Clobbering innerText here resets the caret to position 0 — corrupts fast typing.
    if (document.activeElement === el) return;
    if (el.innerText !== block.text) {
      if (DECORATE_TYPES.has(block.type)) {
        decorateInPlace(el, block.text);
      } else {
        el.innerText = block.text;
      }
    }
  }, [block.text, block.type]);

  // First mount: decorate immediately so existing markers render styled.
  useEffect(() => {
    const el = ref.current;
    if (!el || !DECORATE_TYPES.has(block.type)) return;
    if (document.activeElement === el) return;
    decorateInPlace(el, block.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // IME composition handlers: skip decorate while composing (would
  // break the in-flight accent/CJK input), then re-decorate on end.
  useEffect(() => {
    const el = ref.current;
    if (!el || !DECORATE_TYPES.has(block.type)) return;
    const onStart = () => { composingRef.current = true; };
    const onEnd = () => {
      composingRef.current = false;
      const txt = el.innerText;
      decorateInPlace(el, txt);
    };
    el.addEventListener("compositionstart", onStart);
    el.addEventListener("compositionend", onEnd);
    return () => {
      el.removeEventListener("compositionstart", onStart);
      el.removeEventListener("compositionend", onEnd);
    };
  }, [block.type]);

  const setRef = (el: HTMLElement | null) => {
    ref.current = el;
    registerRef(block.id, el);
  };

  const handleInput = (e: React.FormEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    const text = el.innerText;
    history.record(text);

    // Markdown auto-shortcuts: only fire on plain paragraphs, at line start.
    if (block.type === "paragraph") {
      const trigger = MARKDOWN_TRIGGERS[text];
      if (trigger) {
        el.innerText = "";
        setBlockType(pageId, block.id, trigger.type);
        updateBlock(pageId, block.id, { text: "", ...(trigger.patch ?? {}) });
        setSlashOpen(false);
        return;
      }
    }

    updateBlock(pageId, block.id, { text });

    // Slash menu detection BEFORE decoration (decorator may rewrap "/").
    const isSlash = text === "/" || (text.startsWith("/") && !text.includes("\n"));
    if (isSlash) {
      setSlashOpen(true);
      setSlashQuery(text.slice(1));
    } else {
      setSlashOpen(false);
    }

    // Live WYSIWYG: re-render the editable with styled markers + content.
    // Skip during IME composition to avoid breaking accents/CJK input.
    if (DECORATE_TYPES.has(block.type) && !composingRef.current && !isSlash) {
      decorateInPlace(el, text);
    }
  };

  const convertTo = useCallback((type: BlockType) => {
    setBlockType(pageId, block.id, type);
  }, [pageId, block.id, setBlockType]);

  const handleKeyDown = async (e: KeyboardEvent<HTMLElement>) => {
    const meta = e.metaKey || e.ctrlKey;
    const el = e.currentTarget as HTMLElement;

    if (slashOpen && ["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) return;

    // ----- shortcuts -----
    if (meta && e.key.toLowerCase() === "j") {
      e.preventDefault();
      setAskOpen(true);
      return;
    }
    if (meta && e.altKey && (e.key === "1" || e.key === "2" || e.key === "3")) {
      e.preventDefault();
      convertTo(("h" + e.key) as BlockType);
      return;
    }
    if (meta && e.shiftKey && e.key === "7") { e.preventDefault(); convertTo("todo"); return; }
    if (meta && e.shiftKey && e.key === "8") { e.preventDefault(); convertTo("bullet"); return; }
    if (meta && e.key.toLowerCase() === "d") {
      e.preventDefault();
      const newId = duplicateBlock(pageId, block.id);
      if (newId) setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${newId}"]`)?.focus(), 0);
      return;
    }
    if (meta && e.shiftKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      const txt = history.redo(el.innerText);
      if (txt !== null) {
        el.innerText = txt;
        if (DECORATE_TYPES.has(block.type)) decorateInPlace(el, txt);
        updateBlock(pageId, block.id, { text: txt });
      }
      return;
    }
    if (meta && e.key.toLowerCase() === "y") {
      e.preventDefault();
      const txt = history.redo(el.innerText);
      if (txt !== null) {
        el.innerText = txt;
        if (DECORATE_TYPES.has(block.type)) decorateInPlace(el, txt);
        updateBlock(pageId, block.id, { text: txt });
      }
      return;
    }
    if (meta && e.key.toLowerCase() === "z") {
      e.preventDefault();
      const txt = history.undo(el.innerText);
      if (txt !== null) {
        el.innerText = txt;
        if (DECORATE_TYPES.has(block.type)) decorateInPlace(el, txt);
        updateBlock(pageId, block.id, { text: txt });
      }
      return;
    }

    // ----- editing flow -----
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const next: BlockType =
        block.type === "todo" ? "todo" :
        block.type === "bullet" || block.type === "numbered" ? block.type :
        "paragraph";
      const newId = await addBlock(pageId, index, next);
      setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${newId}"]`)?.focus(), 0);
      return;
    }
    // Shift+Enter: allow native newline (browser inserts <br> in contentEditable)
    if (e.key === "Backspace" && el.innerText === "") {
      e.preventDefault();
      if (total > 1) {
        const blockId = block.id;
        deleteBlock(pageId, blockId);
        setTimeout(() => focusByOffset(blockId, -1), 0);
      } else if (block.type !== "paragraph") {
        setBlockType(pageId, block.id, "paragraph");
      }
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      // visual indent only — store as data attr for now (true outline indent omitted)
      const cur = parseInt(el.dataset.indent ?? "0", 10);
      const newIndent = e.shiftKey ? Math.max(0, cur - 1) : Math.min(4, cur + 1);
      el.dataset.indent = String(newIndent);
      el.style.marginLeft = `${newIndent * 20}px`;
      return;
    }
    if (e.key === "ArrowDown" && (window.getSelection()?.focusOffset ?? 0) === el.innerText.length) {
      focusByOffset(block.id, 1);
    } else if (e.key === "ArrowUp" && (window.getSelection()?.focusOffset ?? 0) === 0) {
      focusByOffset(block.id, -1);
    }
  };

  const uid = () => Math.random().toString(36).slice(2, 10);

  const onSlashSelect = async (type: BlockType) => {
    setSlashOpen(false);
    if (type === "page") {
      const child = await createPage(pageId, { title: "New page" });
      updateBlock(pageId, block.id, { type: "page", text: "New page", pageId: child.id });
      return;
    }
    if (type === "columns2") {
      setBlockType(pageId, block.id, "columns2");
      updateBlock(pageId, block.id, {
        text: "", columns: [
          [{ id: uid(), type: "paragraph", text: "" }],
          [{ id: uid(), type: "paragraph", text: "" }],
        ],
      });
      return;
    }
    if (type === "columns3") {
      setBlockType(pageId, block.id, "columns3");
      updateBlock(pageId, block.id, {
        text: "", columns: [
          [{ id: uid(), type: "paragraph", text: "" }],
          [{ id: uid(), type: "paragraph", text: "" }],
          [{ id: uid(), type: "paragraph", text: "" }],
        ],
      });
      return;
    }
    if (type === "columns4" || type === "columns5") {
      const n = type === "columns4" ? 4 : 5;
      setBlockType(pageId, block.id, type);
      updateBlock(pageId, block.id, {
        text: "",
        columns: Array.from({ length: n }, () => [{ id: uid(), type: "paragraph" as BlockType, text: "" }]),
      });
      return;
    }
    if (type === "toggle") {
      setBlockType(pageId, block.id, "toggle");
      updateBlock(pageId, block.id, { text: "", children: [], collapsed: false });
      return;
    }
    if (type === "database") {
      const db = await createDatabase();
      setBlockType(pageId, block.id, "database");
      updateBlock(pageId, block.id, { text: "", databaseId: db.id });
      return;
    }
    setBlockType(pageId, block.id, type);
    updateBlock(pageId, block.id, { text: "" });
    setTimeout(() => {
      const el2 = document.querySelector<HTMLElement>(`[data-block-id="${block.id}"]`);
      el2?.focus(); if (el2) el2.innerText = "";
    }, 0);
  };

  // ----- Special block types render their own UI -----
  if (block.type === "page") {
    const target = block.pageId ? getPage(block.pageId) : undefined;
    return (
      <BlockShell
        setNodeRef={setNodeRef} style={style} isDragging={isDragging} isOver={isOver} blockId={block.id}
        attributes={attributes} listeners={listeners}
        controls={
          <BlockControls pageId={pageId} block={block} index={index} listeners={listeners} convertTo={convertTo} askOpen={askOpen} onAskOpenChange={setAskOpen} />
        }
      >
        <button
          onClick={() => target ? navigate(`/p/${target.id}`) : undefined}
          draggable={!!target}
          onDragStart={(e) => {
            if (!target) return;
            e.dataTransfer.setData("application/x-page-id", target.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          title={target ? "Drag to sidebar to re-parent" : undefined}
          className="flex w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-left hover:bg-accent transition cursor-grab active:cursor-grabbing"
        >
          <DynamicIcon value={target?.icon} className="text-base shrink-0" />
          <span className="flex-1 text-sm font-medium underline-offset-2 hover:underline">
            {target?.title || target ? (target?.title || "Untitled") : "Missing page"}
          </span>
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </BlockShell>
    );
  }

  if (block.type === "database") {
    return (
      <BlockShell
        setNodeRef={setNodeRef} style={style} isDragging={isDragging} isOver={isOver} blockId={block.id}
        attributes={attributes} listeners={listeners}
        controls={
          <BlockControls pageId={pageId} block={block} index={index} listeners={listeners} convertTo={convertTo} askOpen={askOpen} onAskOpenChange={setAskOpen} />
        }
      >
        <DatabaseBlock pageId={pageId} block={block} />
      </BlockShell>
    );
  }

  if (block.type === "columns2" || block.type === "columns3" || block.type === "columns4" || block.type === "columns5") {
    return (
      <BlockShell
        setNodeRef={setNodeRef} style={style} isDragging={isDragging} isOver={isOver} blockId={block.id}
        attributes={attributes} listeners={listeners}
        controls={<BlockControls pageId={pageId} block={block} index={index} listeners={listeners} convertTo={convertTo} askOpen={askOpen} onAskOpenChange={setAskOpen} />}
      >
        <ColumnBlockEditor block={block} onUpdate={(p) => updateBlock(pageId, block.id, p)} depth={1} pageId={pageId} />
      </BlockShell>
    );
  }

  if (block.type === "toggle") {
    return (
      <ToggleBlock
        pageId={pageId} block={block} index={index}
        setNodeRef={setNodeRef} style={style} isDragging={isDragging} isOver={isOver}
        attributes={attributes} listeners={listeners} convertTo={convertTo}
      />
    );
  }

  const Renderer = getBlockRenderer(block.type);
  if (Renderer) {
    return (
      <BlockShell
        setNodeRef={setNodeRef} style={style} isDragging={isDragging} isOver={isOver} blockId={block.id}
        attributes={attributes} listeners={listeners}
        controls={<BlockControls pageId={pageId} block={block} index={index} listeners={listeners} convertTo={convertTo} askOpen={askOpen} onAskOpenChange={setAskOpen} />}
      >
        <Renderer
          block={block}
          onUpdate={(patch) => updateBlock(pageId, block.id, patch)}
          onReplace={(next) => replaceBlock(pageId, block.id, next)}
          registerRef={(el) => registerRef(block.id, el)}
        />
      </BlockShell>
    );
  }

  return (
    <BlockShell
      setNodeRef={setNodeRef} style={style} isDragging={isDragging} isOver={isOver} blockId={block.id}
      attributes={attributes} listeners={listeners}
      controls={<BlockControls pageId={pageId} block={block} index={index} listeners={listeners} convertTo={convertTo} askOpen={askOpen} onAskOpenChange={setAskOpen} />}
    >
      <BlockBody
        block={block}
        setRef={setRef}
        handleInput={handleInput}
        handleKeyDown={handleKeyDown}
        onCheck={(c) => updateBlock(pageId, block.id, { checked: c })}
        onLang={(lang) => updateBlock(pageId, block.id, { lang })}
      />
      {slashOpen && (
        <div className="relative pl-7">
          <SlashMenu
            query={slashQuery}
            onSelect={onSlashSelect}
            onClose={() => setSlashOpen(false)}
            onSelectLinkedDatabase={() => {
              setSlashOpen(false);
              setPickerOpen(true);
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
