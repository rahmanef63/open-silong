import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { makeStorageRef } from "../lib/parse";
import type { FileRef } from "../types";

export function useFileUpload() {
  const generateUploadUrl = useMutation(api["features/files/mutations"].generateUploadUrl);
  const removeStorage = useMutation(api["features/files/mutations"].remove);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = useCallback(async (file: File): Promise<FileRef> => {
    setUploading(true);
    setProgress(0);
    try {
      const url = await generateUploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const { storageId } = await res.json();
      setProgress(100);
      return makeStorageRef(storageId, file.name);
    } finally {
      setUploading(false);
    }
  }, [generateUploadUrl]);

  const removeFromStorage = useCallback(async (storageId: string) => {
    await removeStorage({ storageId });
  }, [removeStorage]);

  return { upload, uploading, progress, removeFromStorage };
}
