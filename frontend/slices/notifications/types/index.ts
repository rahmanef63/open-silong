export type SubscriptionScope = "page" | "thread" | "edits" | "comments";

export interface PageSubscription {
  pageId: string;
  scopes: SubscriptionScope[];
  createdAt: number;
}

export const SUBSCRIPTION_SCOPE_LABELS: Record<SubscriptionScope, string> = {
  page: "All page activity",
  thread: "Thread replies",
  edits: "Edits",
  comments: "New comments",
};
