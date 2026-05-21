import { useState } from "react";
import { toast } from "sonner";
import { useNotionAdapter } from "@/slices/notion";
import { reportError } from "@/shared/lib/error";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

export function useImageUpload(onUrl: (url: string) => void) {
  const [uploading, setUploading] = useState(false);
  const { files } = useNotionAdapter();

  const onUploadFile = async (file: File) => {
    if (uploading) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image too large (max 10 MB)");
      return;
    }
    setUploading(true);
    try {
      const storageId = await files.upload(file);
      const url = await files.resolveUrl(storageId);
      if (!url) throw new Error("Storage URL not available");
      onUrl(url);
      toast.success("Image uploaded");
    } catch (err) {
      const safe = reportError("ImageBlock.upload", err);
      toast.error(safe.message);
    } finally {
      setUploading(false);
    }
  };

  return { uploading, onUploadFile };
}
