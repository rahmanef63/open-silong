export interface Mention {
  /** The page where the mention lives */
  pageId: string;
  pageTitle: string;
  pageIcon: string;
  /** The block id where it's referenced (for jumping) */
  blockId: string;
  /** Excerpt of the surrounding text */
  excerpt: string;
  /** The handle that was mentioned (without `@`) */
  handle: string;
}
