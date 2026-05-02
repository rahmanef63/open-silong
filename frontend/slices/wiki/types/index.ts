/**
 * "Wiki mode" treats a page as the canonical entry for a topic, with
 * verification status and an owner. Disabled until backend support lands.
 */
export interface WikiMeta {
  pageId: string;
  verified: boolean;
  ownerName: string | null;
  ownerIcon: string | null;
  verifiedAt: number | null;
}
