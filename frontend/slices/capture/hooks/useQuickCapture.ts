"use client";

import { useCallback, useState } from "react";
import { usePages } from "@/shared/lib/store";
import { useNavigate } from "@/shared/lib/router";
import { ROUTES_ABS } from "@/shared/lib/routes";
import { markdownToBlocks } from "@/shared/lib/markdown";
import { runCapture } from "../lib/runCapture";
import type { CaptureInput, CapturePrefs } from "../types";

/** React wrapper around the pure `runCapture` orchestrator. Wires the
 *  real store (createPage + updatePage), router, and markdown parser;
 *  owns the dialog open state. Mount the dialog with the returned
 *  `{ open, setOpen }` and pass `capture` as its `onCapture`. */
export function useQuickCapture(prefs?: CapturePrefs) {
  const { createPage, updatePage } = usePages();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const capture = useCallback(
    (input: CaptureInput) =>
      runCapture(input, {
        prefs,
        createPage: async (parentId, opts) => {
          const page = await createPage(parentId, opts);
          return { id: page.id };
        },
        setBlocks: (pageId, blocks) => updatePage(pageId, { blocks: blocks as never }),
        toBlocks: (md) => markdownToBlocks(md),
        navigate,
        pageUrl: ROUTES_ABS.page,
      }),
    [prefs, createPage, updatePage, navigate],
  );

  return { open, setOpen, capture };
}
