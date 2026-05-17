/** Global keyboard shortcut: Cmd/Ctrl+J inside a contentEditable block
 *  runs an AI continuation and appends the result to the focused block.
 *  Notion-canonical inline-AI ergonomics without overlay complexity.
 *
 *  Resolves the focused block by walking from `document.activeElement`
 *  to the nearest `[data-block-id]`, then resolves the parent page id
 *  via the store. Skips when no active page is loaded or the cursor
 *  isn't inside a contentEditable surface.
 */

import { useEffect, useRef } from "react";
import { useAction } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { useBlocks, usePages } from "@/shared/lib/store";
import { reportError } from "@/shared/lib/error";

const SYSTEM_CONTINUE =
  "Continue the user's writing in the same voice and tone. Add 1-2 short paragraphs of natural prose. Do NOT repeat the existing text. Do NOT add headings or markdown formatting.";

function findFocusedBlockId(): string | null {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return null;
  const blockEl = el.closest<HTMLElement>("[data-block-id]");
  return blockEl?.dataset.blockId ?? null;
}

export function useInlineAiShortcut() {
  const { updateBlock } = useBlocks();
  const { pages } = usePages();
  const complete = useAction(api.ai.chat.complete);
  const pendingRef = useRef(false);

  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "j") return;
      const blockId = findFocusedBlockId();
      if (!blockId) return;
      const page = pages.find((p) => p.blocks.some((b) => b.id === blockId));
      if (!page) return;
      const block = page.blocks.find((b) => b.id === blockId);
      if (!block || !block.text || block.text.trim().length < 10) return;
      e.preventDefault();
      if (pendingRef.current) return;
      pendingRef.current = true;
      const toastId = toast.loading("AI continuing…");
      try {
        const res = await complete({
          messages: [{ role: "user", content: block.text }],
          system: SYSTEM_CONTINUE,
          maxTokens: 400,
        });
        const next = (res.text ?? "").trim();
        if (!next) {
          toast.error("AI returned empty response", { id: toastId });
          return;
        }
        updateBlock(page.id, block.id, { text: `${block.text}\n\n${next}` });
        toast.success("AI continued", { id: toastId });
      } catch (err) {
        const safe = reportError("InlineAi.continue", err);
        toast.error(safe.message, { id: toastId });
      } finally {
        pendingRef.current = false;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pages, complete, updateBlock]);
}
