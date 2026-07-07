/** memory-graph — knowledge graph (global route + per-page ego panel).
 *
 *  Barrel = the external contract (what routes/other slices import). Internals
 *  use relative paths.
 */

export { GraphPage } from "./views/GraphPage";
export type { GraphPageProps, MemoryLabels } from "./views/GraphPage";
export { LocalGraphPanel } from "./components/LocalGraphPanel";
