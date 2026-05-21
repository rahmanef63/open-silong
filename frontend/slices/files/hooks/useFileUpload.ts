import { useState, useCallback } from "react";
import { useFilesAdapter } from "../adapter/context";
import { makeStorageRef } from "../lib/parse";
import type { FileRef } from "../types";

export function useFileUpload() {
  const adapter = useFilesAdapter();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = useCallback(
    async (file: File): Promise<FileRef> => {
      setUploading(true);
      setProgress(0);
      try {
        const storageId = await adapter.upload(file);
        setProgress(100);
        return makeStorageRef(storageId, file.name);
      } finally {
        setUploading(false);
      }
    },
    [adapter],
  );

  const removeFromStorage = useCallback(
    async (storageId: string) => {
      await adapter.remove(storageId);
    },
    [adapter],
  );

  return { upload, uploading, progress, removeFromStorage };
}
