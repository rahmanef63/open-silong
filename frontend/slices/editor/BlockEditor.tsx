import { memo, useRef, useState, useCallback } from "react";
import { Block, BlockType } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { SlashMenu } from "./SlashMenu";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useBlockHistory } from "@/shared/hooks/useBlockHistory";
import { DatabaseBlock } from "@/slices/databases";
import { ColumnBlockEditor } from "./ColumnBlockEditor";
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
import { PageRefBlock } from "./block-editor/PageRefBlock";

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
    createPage, createDatabase, replaceBlock,
  } = useStore();
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [askOpen, setAskOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const ref = useRef<HTMLElement | null>(null);
  const composingRef = useRef(false);
  const history = useBlockHistory(block.text);

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

  const onSlashSelect = (type: BlockType) => {
    setSlashOpen(false);
    return runSlashSelect(type, { pageId, block, createPage, createDatabase, setBlockType, updateBlock });
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
        <DatabaseBlock pageId={pageId} block={block} />
      </BlockShell>
    );
  }

  if (block.type === "columns2" || block.type === "columns3" || block.type === "columns4" || block.type === "columns5") {
    return (
      <BlockShell {...shellProps} controls={controls}>
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
