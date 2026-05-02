export interface Comment {
  id: string;
  pageId: string;
  blockId?: string;
  text: string;
  authorName: string;
  authorIcon: string;
  resolved: boolean;
  createdAt: number;
  updatedAt: number;
}
