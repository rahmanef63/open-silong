/**
 * Stored as a string in property values. Either:
 *  - "storage:<id>:<filename>"        — uploaded to Convex storage
 *  - "https://…"                      — external URL
 *  - "<filename>"                     — legacy plain string (display only)
 */
export type FileRef = string;

export interface ParsedFileRef {
  kind: "storage" | "url" | "name";
  storageId?: string;
  filename: string;
  raw: string;
}
