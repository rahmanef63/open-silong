export interface PageAnalytics {
  pageId: string;
  blocks: number;
  characters: number;
  words: number;
  subpages: number;
  edits: number;
  ageMs: number;
  lastEditMs: number;
  snapshotCount: number;
  commentCount: number;
}
