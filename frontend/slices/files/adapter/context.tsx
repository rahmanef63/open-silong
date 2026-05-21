"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { FilesAdapter } from "./types";

const FilesAdapterContext = createContext<FilesAdapter | null>(null);

export function FilesAdapterProvider({
  adapter,
  children,
}: {
  adapter: FilesAdapter;
  children: ReactNode;
}) {
  return (
    <FilesAdapterContext.Provider value={adapter}>
      {children}
    </FilesAdapterContext.Provider>
  );
}

export function useFilesAdapter(): FilesAdapter {
  const adapter = useContext(FilesAdapterContext);
  if (!adapter) {
    throw new Error(
      "useFilesAdapter: no FilesAdapterProvider mounted. Wrap your tree with " +
        "<FilesAdapterProvider adapter={…}> — see frontend/slices/files/adapter/.",
    );
  }
  return adapter;
}
