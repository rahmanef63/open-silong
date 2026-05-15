/** Domain-neutral comment shape. The kitab portable contract.
 *
 *  `targetId` is the primary host identifier (e.g. page id, doc id, ticket
 *  id — consumer's choice). `targetSubId` is an optional sub-target within
 *  the same host (e.g. block id within a page). `targetKind` is a free-form
 *  discriminator the consumer may use when storing comments across multiple
 *  host types in one table.
 *
 *  Adapters translate consumer-specific entity ids to/from this shape.
 */
export interface Comment {
  id: string;
  /** Primary target id. Replaces the legacy `pageId` field. */
  targetId: string;
  /** Optional sub-target id (e.g. block within a page). Replaces `blockId`. */
  targetSubId?: string;
  /** Optional discriminator when one comments table backs multiple host
   *  kinds. Consumer-defined string ("page" | "block" | "row" | …). */
  targetKind?: string;
  text: string;
  authorName: string;
  authorIcon: string;
  resolved: boolean;
  createdAt: number;
  updatedAt: number;
  /** Author user id. Absent on public-share DTOs (sanitized). */
  authorId?: string;
}
