import { useFilesAdapter } from "../adapter/context";

export function useFileUrl(storageId: string | null | undefined): string | null {
  const adapter = useFilesAdapter();
  return adapter.useUrl(storageId);
}
