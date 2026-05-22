import { useState } from "react";
import { toast } from "sonner";
import { useNotionAdapter } from "@/slices/notion";
import { reportError } from "@/shared/lib/error";

export type MediaKind = "audio" | "video";

const SIZE_CAP: Record<MediaKind, number> = {
  audio: 25 * 1024 * 1024,    // 25 MB — typical podcast clip
  video: 100 * 1024 * 1024,   // 100 MB — short clip
};

const LABEL: Record<MediaKind, string> = {
  audio: "Audio",
  video: "Video",
};

/** Generic upload hook for audio + video. Mirrors `useImageUpload` but
 *  parameterised by `kind` — MIME prefix + size cap + toast label. */
export function useMediaUpload(kind: MediaKind, onUrl: (url: string) => void) {
  const [uploading, setUploading] = useState(false);
  const { files } = useNotionAdapter();

  const onUploadFile = async (file: File) => {
    if (uploading) return;
    if (!file.type.startsWith(`${kind}/`)) {
      toast.error(`Pick a${kind === "audio" ? "n" : ""} ${kind} file`);
      return;
    }
    if (file.size > SIZE_CAP[kind]) {
      toast.error(`${LABEL[kind]} too large (max ${Math.round(SIZE_CAP[kind] / 1024 / 1024)} MB)`);
      return;
    }
    setUploading(true);
    try {
      const storageId = await files.upload(file);
      const url = files.resolveUrl ? await files.resolveUrl(storageId) : storageId;
      if (!url) throw new Error("Storage URL not available");
      onUrl(url);
      toast.success(`${LABEL[kind]} uploaded`);
    } catch (err) {
      const safe = reportError(`${LABEL[kind]}Block.upload`, err);
      toast.error(safe.message);
    } finally {
      setUploading(false);
    }
  };

  return { uploading, onUploadFile };
}
