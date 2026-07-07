"use client";

/** Host wiring for the "Memory" graph. Feeds the server graph model + every
 *  action into the portable slice. "Add a memory" routes through the real AI
 *  pipeline (ai.chat.complete + skill catalog) so a raw note becomes a distilled
 *  page with #tags + [[wikilinks]] — which reindexPageLinks turns into graph
 *  edges automatically. Keeps the slice convex-free.
 */

import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { GraphPage } from "@/slices/memory-graph";
import { useNavigate } from "@/shared/lib/router";
import { ROUTES } from "@/shared/lib/routes";
import { useWorkspaces } from "@/shared/lib/store";
import { useWorkspaceIO } from "@/slices/workspace-io";
import { reportError } from "@/shared/lib/error";
import type { GraphNode } from "@/shared/types/graph";

/** System prompt for the memory-capture flow. Prompt-as-data, not scattered
 *  inline — the model uses the existing pages.* skills to distill + link. */
const MEMORY_CAPTURE_PROMPT = `You are the memory keeper for a personal knowledge graph. The user gives you a raw note (a "memory"). Turn it into a well-formed page — act, don't ask:
1. Call pages.search to find existing pages this memory relates to.
2. Call pages.create with a concise, specific title (a distilled phrase — NOT the raw text dumped in).
3. Call pages.append_markdown on that new page with the memory as clean markdown: a one-line summary, then the details. Add relevant #tags, and link related pages you found with [[Exact Page Title]] wikilinks.
Keep it tight and factual.`;

export function GraphRouteClient() {
  const graph = useQuery(api.features.graph.queries.getGlobalGraph, {});
  const createPage = useMutation(api.pages.create);
  const captureMemory = useAction(api.ai.chat.complete);
  const navigate = useNavigate();
  const { workspace } = useWorkspaces();
  const workspaceIO = useWorkspaceIO();

  // Hover "+" → create a child page under the node, then open it. The reactive
  // getGlobalGraph query repaints the new node + hierarchy edge.
  const onAddChild = async (node: GraphNode) => {
    const newId = await createPage({ parentId: node.id as Id<"pages">, title: "Untitled" });
    if (newId) navigate(ROUTES.page(String(newId)));
  };

  // "Add a memory" → the AI distills the note into a linked page. Falls back to
  // a plain page if the AI is unavailable so the memory is never lost. Stays on
  // the graph; the new node appears reactively once the write lands.
  const onSubmitMemory = async (text: string) => {
    try {
      await captureMemory({
        messages: [{ role: "user", content: text }],
        system: MEMORY_CAPTURE_PROMPT,
        autoApply: true,
        context: { workspaceName: workspace?.name },
      });
    } catch (err) {
      reportError("memory.capture", err);
      try {
        await createPage({ parentId: null, title: text.slice(0, 120) });
      } catch (e2) {
        reportError("memory.fallback", e2);
      }
    }
  };

  return (
    <GraphPage
      model={graph ?? undefined}
      onAddChild={onAddChild}
      onSubmitMemory={onSubmitMemory}
      onImport={() => workspaceIO.open()}
      workspaceName={workspace?.name}
    />
  );
}
