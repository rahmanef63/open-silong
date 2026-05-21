/**
 * Host-supplied storage backend for the `files` slice.
 *
 * The slice itself ships no Convex / S3 / GCS coupling — every read,
 * write, and URL resolve flows through this interface. Hosts wire an
 * adapter via `<FilesAdapterProvider adapter={...}>`. Two reference
 * implementations live in this directory:
 *
 *   - `convexAdapter.tsx`     — production, backed by self-hosted Convex.
 *     Skipped by `scripts/sync-to-rr.mjs` so rr never sees the import.
 *   - `localStorageAdapter.ts` — demo bucket, blobs stored as data URLs
 *     in `localStorage`. Small files only; cleared by browser quota.
 *
 * `useUrl` is intentionally a hook (not a plain async function) so the
 * Convex adapter can use `useQuery` for live URL invalidation. Callers
 * always invoke it through `useFilesAdapter().useUrl(id)` so the hook
 * call order remains stable.
 */
export interface FilesAdapter {
  /** Upload a blob, return the host-specific storage id (FileRef tail). */
  upload(file: File): Promise<string>;

  /** Permanently remove a blob by its storage id. */
  remove(storageId: string): Promise<void>;

  /** Resolve a storage id to a fetchable URL. `null` for "not ready yet"
   *  (still resolving) or "missing" (deleted). Hooks rule: always call. */
  useUrl(storageId: string | null | undefined): string | null;
}
