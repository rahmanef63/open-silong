"use client";

/**
 * Demo adapter — stores blobs as data URLs in `localStorage`. Intended
 * for portfolio / template / `rr` demo environments where there is no
 * backend storage. Quota (typically 5–10MB per origin) caps total size,
 * so callers should expect upload failures for large files.
 *
 * For production, replace with `useConvexFilesAdapter` or write your
 * own adapter pointing at S3 / GCS / R2 / etc.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FilesAdapter } from "./types";

const KEY_PREFIX = "files-demo:";

function blobToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function genId(): string {
  const rand = (globalThis as { crypto?: Crypto }).crypto?.randomUUID?.();
  return rand ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useLocalStorageFilesAdapter(): FilesAdapter {
  const upload = useCallback(async (file: File): Promise<string> => {
    const id = genId();
    const dataUrl = await blobToDataUrl(file);
    try {
      localStorage.setItem(KEY_PREFIX + id, dataUrl);
    } catch (e) {
      throw new Error(
        `localStorage quota exceeded — file too large for demo adapter. ` +
          `Wire a real FilesAdapter for production. (${(e as Error).message})`,
      );
    }
    return id;
  }, []);

  const remove = useCallback(async (storageId: string) => {
    localStorage.removeItem(KEY_PREFIX + storageId);
  }, []);

  const useUrl = (storageId: string | null | undefined): string | null => {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
      if (!storageId) {
        setUrl(null);
        return;
      }
      try {
        setUrl(localStorage.getItem(KEY_PREFIX + storageId));
      } catch {
        setUrl(null);
      }
    }, [storageId]);
    return url;
  };

  return useMemo<FilesAdapter>(() => ({ upload, remove, useUrl }), [upload, remove]);
}
