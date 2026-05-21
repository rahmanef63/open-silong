"use client";

/**
 * Production adapter — backs the `files` slice with self-hosted Convex
 * file storage. Wired into nosion at app/providers.tsx. This file is
 * skip-listed in scripts/sync-to-rr.mjs (rr-sync.json.skipFiles) so the
 * rr-side lift never inherits a Convex import.
 */
import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo } from "react";
import { api } from "@convex/_generated/api";
import type { FilesAdapter } from "./types";

export function useConvexFilesAdapter(): FilesAdapter {
  const generateUploadUrl = useMutation(api["features/files/mutations"].generateUploadUrl);
  const confirmUpload = useMutation(api["features/files/mutations"].confirmUpload);
  const removeStorage = useMutation(api["features/files/mutations"].remove);

  const upload = useCallback(
    async (file: File): Promise<string> => {
      const url = await generateUploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const { storageId } = await res.json();
      await confirmUpload({ storageId });
      return storageId as string;
    },
    [generateUploadUrl, confirmUpload],
  );

  const remove = useCallback(
    async (storageId: string) => {
      await removeStorage({ storageId });
    },
    [removeStorage],
  );

  const useUrl = (storageId: string | null | undefined): string | null => {
    const url = useQuery(
      api["features/files/queries"].getUrl,
      storageId ? { storageId } : "skip",
    );
    return url ?? null;
  };

  return useMemo<FilesAdapter>(() => ({ upload, remove, useUrl }), [upload, remove]);
}
