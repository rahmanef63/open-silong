import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function useFileUrl(storageId: string | null | undefined): string | null {
  const url = useQuery(
    api["features/files/queries"].getUrl,
    storageId ? { storageId } : "skip",
  );
  return url ?? null;
}
