import { useEffect, type MutableRefObject } from "react";
import type { Block, BlockType } from "@/shared/types/domain";
import { decorateInPlace } from "../lib/inlineDecorator";
import { DECORATE_TYPES } from "./decorateTypes";

const HEADING_TYPES = new Set<BlockType>(["h1", "h2", "h3", "h4"]);
const decorateOpts = (t: BlockType) => HEADING_TYPES.has(t) ? { hideMarkers: true } : undefined;

/** Bundles the three decorate-related effects so BlockEditor stays small:
 *  - sync DOM to block.text when text changes from outside (not while typing)
 *  - decorate on mount
 *  - decorate on compositionend (IME-safe) */
export function useBlockDecorate(
  ref: MutableRefObject<HTMLElement | null>,
  block: Block,
  composingRef: MutableRefObject<boolean>,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // While the user is typing, the DOM is the source of truth.
    // Clobbering innerText resets caret to position 0.
    if (document.activeElement === el) return;
    if (el.innerText !== block.text) {
      if (DECORATE_TYPES.has(block.type)) {
        decorateInPlace(el, block.text, decorateOpts(block.type));
      } else {
        el.innerText = block.text;
      }
    }
  }, [block.text, block.type, ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !DECORATE_TYPES.has(block.type)) return;
    if (document.activeElement === el) return;
    decorateInPlace(el, block.text, decorateOpts(block.type));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !DECORATE_TYPES.has(block.type)) return;
    const onStart = () => { composingRef.current = true; };
    const onEnd = () => {
      composingRef.current = false;
      decorateInPlace(el, el.innerText, decorateOpts(block.type));
    };
    el.addEventListener("compositionstart", onStart);
    el.addEventListener("compositionend", onEnd);
    return () => {
      el.removeEventListener("compositionstart", onStart);
      el.removeEventListener("compositionend", onEnd);
    };
  }, [block.type, ref, composingRef]);
}
