"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Upload, FileJson, FileArchive } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { ExportTab } from "./ExportTab";
import { ImportJsonTab } from "./ImportJsonTab";
import { ImportZipTab, type ImportZipTabHandle } from "./ImportZipTab";
import type { WorkspaceIOTab } from "../lib/types";

export type { WorkspaceIOTab } from "../lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: WorkspaceIOTab;
  /** Page id to pre-select in the Export tab. Defaults to nothing. */
  preselectPageId?: string;
  /** Where ZIP-imported pages should be parented. null = root. */
  zipParentId?: string | null;
}

export function WorkspaceIODialog({
  open, onOpenChange, initialTab = "export",
  preselectPageId, zipParentId = null,
}: Props) {
  const [tab, setTab] = useState<WorkspaceIOTab>(initialTab);
  const zipRef = useRef<ImportZipTabHandle>(null);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  function handleClose(o: boolean) {
    if (!o) zipRef.current?.reset();
    onOpenChange(o);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-4 w-4 text-brand" />
            Export / Import
          </DialogTitle>
          <DialogDescription>
            Round-trip pages and databases as JSON, or bulk-import a Notion-style ZIP.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as WorkspaceIOTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="export">
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export JSON
            </TabsTrigger>
            <TabsTrigger value="import-json">
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Import JSON
            </TabsTrigger>
            <TabsTrigger value="import-zip">
              <FileArchive className="mr-1.5 h-3.5 w-3.5" /> Import ZIP
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export">
            <ExportTab preselectPageId={preselectPageId} />
          </TabsContent>
          <TabsContent value="import-json">
            <ImportJsonTab onClose={() => handleClose(false)} />
          </TabsContent>
          <TabsContent value="import-zip">
            <ImportZipTab ref={zipRef} zipParentId={zipParentId} onClose={() => handleClose(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
