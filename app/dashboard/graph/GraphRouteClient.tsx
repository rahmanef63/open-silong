"use client";

/** Host wiring for the global memory graph. The portable `memory-graph` slice
 *  is prop-driven and, without a model, falls back to the client model built
 *  from the pages store (`store.tsx` loads `api.pages.listMeta`, which omits
 *  block content → edge-sparse). Open-silong instead feeds it the SERVER graph
 *  (`getGlobalGraph`), which reads the real `pageLinks` edges. While the query
 *  is loading (`undefined`), we pass `undefined` so `GraphView` uses its client
 *  fallback. Keeps the slice itself convex-free.
 */

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { GraphPage } from "@/slices/memory-graph";

export function GraphRouteClient() {
  const graph = useQuery(api.features.graph.queries.getGlobalGraph, {});
  return <GraphPage model={graph ?? undefined} />;
}
