import { useState } from "react";
import { useMutation, useConvex } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { reportError } from "@/shared/lib/error";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

export function useImageUpload(onUrl: (url: string) => void) {
  const [uploading, setUploading] = useState(false);
  const generateUploadUrl = useMutation(api["features/files/mutations"].generateUploadUrl);
  const confirmUpload = useMutation(api["features/files/mutations"].confirmUpload);
  const convex = useConvex();

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
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const { storageId } = (await res.json()) as { storageId: string };
      await confirmUpload({ storageId });
      const url = await convex.query(api["features/files/queries"].getUrl, { storageId });
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
