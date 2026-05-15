/**
 * Polymorphic anchor for a comment thread — kitab v0.2.0 portable contract.
 *
 * The kitab `comments` slice intentionally does NOT bake in consumer-specific
 * entity names. Consumer projects pick the `kind` literal (e.g. "page",
 * "blog-post", "task") and resolve `id` / `subId` to whatever primary +
 * optional sub-anchor matches their domain.
 *
 * - notion: `{ kind: "page", id: <page-uid>, subId: <block-uid> }`
 * - rahmanef.com blog: `{ kind: "blog", id: <post-slug> }`
 * - rahmanef.com portfolio: `{ kind: "portfolio", id: <work-slug> }`
 *
 * See kitab `docs/contract-negotiations-2026-05-15.md` §1.
 */
export type TargetRef = {
  /** Consumer-defined entity kind literal. */
  kind: string;
  /** Primary entity id. */
  id: string;
  /** Optional secondary anchor (e.g. a sub-target within a host). */
  subId?: string;
};

export interface Comment {
  id: string;
  /** Polymorphic target — replaces v0.1.0's host-coupled id pair. */
  target: TargetRef;
  text: string;
  authorName: string;
  authorIcon: string;
  resolved: boolean;
  createdAt: number;
  updatedAt: number;
  /** Author user id. Absent on public-share DTOs (sanitized). */
  authorId?: string;
}
