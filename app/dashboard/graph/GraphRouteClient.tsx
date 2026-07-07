"use client";

/** Host wiring for the "Memory" graph. The portable `memory-graph` slice is
 *  prop-driven; the host supplies the SERVER graph model (`getGlobalGraph`,
 *  which reads real `pageLinks` edges — the client fallback is edge-sparse
 *  because the store loads `api.pages.listMeta` without blocks) plus every
 *  write/action (add child, add memory, import, workspace name). Keeps the
 *  slice itself convex-free.
 */

import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { GraphPage } from "@/slices/memory-graph";
import { useNavigate } from "@/shared/lib/router";
import { ROUTES } from "@/shared/lib/routes";
import { useWorkspaces } from "@/shared/lib/store";
import { useWorkspaceIO } from "@/slices/workspace-io";
import type { GraphNode } from "@/shared/types/graph";

export function GraphRouteClient() {
  const graph = useQuery(api.features.graph.queries.getGlobalGraph, {});
  const createPage = useMutation(api.pages.create);
  const navigate = useNavigate();
  const { workspace } = useWorkspaces();
  const workspaceIO = useWorkspaceIO();

  // Hover "+" → create a child page under the node, then open it. The reactive
  // getGlobalGraph query repaints the new node + hierarchy edge.
  const onAddChild = async (node: GraphNode) => {
    const newId = await createPage({ parentId: node.id as Id<"pages">, title: "Untitled" });
    if (newId) navigate(ROUTES.page(String(newId)));
  };

  // Bottom input → a "memory" is a top-level page titled with the text. Stay on
  // the graph; the new node just appears. ponytail: no LLM extraction yet.
  const onSubmitMemory = async (text: string) => {
    await createPage({ parentId: null, title: text.slice(0, 200) });
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
