"use client";

/** Host wiring for the global memory graph. The portable `memory-graph` slice
 *  is prop-driven and, without a model, falls back to the client model built
 *  from the pages store (`store.tsx` loads `api.pages.listMeta`, which omits
 *  block content → edge-sparse). Open-silong instead feeds it the SERVER graph
 *  (`getGlobalGraph`), which reads the real `pageLinks` edges. While the query
 *  is loading (`undefined`), we pass `undefined` so `GraphView` uses its client
 *  fallback. Keeps the slice itself convex-free.
 */

import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { GraphPage } from "@/slices/memory-graph";
import { useNavigate } from "@/shared/lib/router";
import { ROUTES } from "@/shared/lib/routes";
import type { GraphNode } from "@/shared/types/graph";

export function GraphRouteClient() {
  const graph = useQuery(api.features.graph.queries.getGlobalGraph, {});
  const createPage = useMutation(api.pages.create);
  const navigate = useNavigate();

  // Create a page parented to the right-clicked node, then open it. The
  // reactive `getGlobalGraph` query repaints the new node + hierarchy edge.
  const onAddChild = async (node: GraphNode) => {
    const newId = await createPage({ parentId: node.id as Id<"pages">, title: "Untitled" });
    if (newId) navigate(ROUTES.page(String(newId)));
  };

  return <GraphPage model={graph ?? undefined} onAddChild={onAddChild} />;
}
