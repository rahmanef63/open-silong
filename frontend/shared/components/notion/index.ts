/** Notion wrapper components — portable Notion-style primitives.
 *
 *  Pure / props-driven · callback-based CRUD · no store reach-arounds.
 *  Drop any of these into another React app and wire the callbacks to
 *  your own data source.
 *
 *  Composition:
 *    <NotionPage>           — page shell w/ header + body slot
 *      <NotionHeader>       — editable icon + title + cover
 *      …user blocks
 *        <NotionBlock>      — single-block renderer (dispatches via registry)
 *      …embedded data
 *        <NotionDatabase>   — table view w/ property + row CRUD
 *          <NotionProperty> — value + schema editor (per-cell)
 *
 *    <NotionSidebar>        — tree nav w/ page CRUD (standalone)
 */

export { NotionHeader } from "./NotionHeader";
export type { NotionHeaderProps } from "./NotionHeader";

export { NotionSidebar } from "./NotionSidebar";
export type { NotionSidebarProps, NotionSidebarPage } from "./NotionSidebar";

export { NotionPage } from "./NotionPage";
export type { NotionPageProps } from "./NotionPage";

export { NotionBlock } from "./NotionBlock";
export type { NotionBlockProps } from "./NotionBlock";

export { NotionDatabase } from "./NotionDatabase";
export type { NotionDatabaseProps } from "./NotionDatabase";

export { NotionProperty } from "./NotionProperty";
export type { NotionPropertyProps } from "./NotionProperty";
