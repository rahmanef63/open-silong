"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { WorkspaceIODialog, type WorkspaceIOTab } from "@/slices/workspace-io/components/WorkspaceIODialog";

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
 *  own dialog instance or share state via prop drilling. */
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
      <WorkspaceIODialog
        open={open}
        onOpenChange={handleOpenChange}
        initialTab={opts.tab}
        preselectPageId={opts.preselectPageId}
        zipParentId={opts.zipParentId}
      />
    </WorkspaceIOContext.Provider>
  );
}

export function useWorkspaceIO(): ContextShape {
  return useContext(WorkspaceIOContext);
}
