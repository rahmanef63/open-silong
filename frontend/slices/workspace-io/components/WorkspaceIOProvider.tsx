"use client";

import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState } from "react";
import type { WorkspaceIOTab } from "./WorkspaceIODialog";

// Lazy so the export/import dialog (+ its ZIP/files subtree, ~39KB) leaves the
// eager dashboard-shell chunk this provider mounts into. Type-only import above
// keeps the module out of first-load; the code loads on first open().
const WorkspaceIODialog = lazy(() =>
  import("./WorkspaceIODialog").then((m) => ({ default: m.WorkspaceIODialog })),
);

interface OpenOpts {
  tab?: WorkspaceIOTab;
  /** Pre-check this page id in the Export tab. */
  preselectPageId?: string;
  /** Where ZIP-imported pages should be parented. */
  zipParentId?: string | null;
}

interface ContextShape {
  open: (opts?: OpenOpts) => void;
  close: () => void;
}

const WorkspaceIOContext = createContext<ContextShape>({
  open: () => {},
  close: () => {},
});

/** Mount once per app under the Store/Auth providers. Lets any
 *  surface (sidebar, page action menu, AI agent, command palette)
 *  pop the unified Export/Import dialog without having to render its
 *  own dialog instance or share state via prop drilling.
 *
 *  Lives inside the slice — `@/shared/providers` re-exports for the
 *  legacy import path. */
export function WorkspaceIOProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<OpenOpts>({});

  const ctx = useMemo<ContextShape>(() => ({
    open: (next) => {
      setOpts(next ?? {});
      setOpen(true);
    },
    close: () => setOpen(false),
  }), []);

  // Reset opts when dialog closes so the next open() starts clean.
  const handleOpenChange = useCallback((o: boolean) => {
    setOpen(o);
    if (!o) setOpts({});
  }, []);

  return (
    <WorkspaceIOContext.Provider value={ctx}>
      {children}
      {open && (
        <Suspense fallback={null}>
          <WorkspaceIODialog
            open={open}
            onOpenChange={handleOpenChange}
            initialTab={opts.tab}
            preselectPageId={opts.preselectPageId}
            zipParentId={opts.zipParentId}
          />
        </Suspense>
      )}
    </WorkspaceIOContext.Provider>
  );
}

export function useWorkspaceIO(): ContextShape {
  return useContext(WorkspaceIOContext);
}
