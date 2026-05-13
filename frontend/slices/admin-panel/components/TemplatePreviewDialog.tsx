"use client";

import { useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { Pencil } from "lucide-react";
import { walkTemplateTree, templateStats } from "@/slices/templates/lib/previewTemplate";
import { TemplatePagePreview } from "@/slices/templates/components/TemplatePagePreview";
import { TreeNode } from "./template-preview/parts";
import { InfoTab } from "./template-preview/InfoTab";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: {
    _id: string;
    name: string;
    icon: string;
    category: string;
    description?: string | null;
    isPublished: boolean;
    isSeed: boolean;
    json: unknown;
  } | null;
  onEdit?: () => void;
}

export function TemplatePreviewDialog({ open, onOpenChange, template, onEdit }: Props) {
  const tree = useMemo(() => (template ? walkTemplateTree(template.json) : null), [template]);
  const stats = useMemo(() => (template ? templateStats(template.json) : null), [template]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col">
        {template && (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
              <div className="flex items-start gap-3">
                <div className="shrink-0 h-12 w-12 rounded-lg border border-border bg-background flex items-center justify-center text-3xl">
                  <DynamicIcon value={template.icon} />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-lg flex items-center gap-2 flex-wrap leading-snug">
                    <span className="truncate">{template.name}</span>
                    {template.isSeed && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">seed</Badge>
                    )}
                    {template.isPublished ? (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-emerald-500/50 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5">live</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/5">draft</Badge>
                    )}
                  </DialogTitle>
                  <DialogDescription className="mt-1 break-words">
                    <span className="font-medium text-foreground/70">{template.category}</span>
                    {template.description ? <span className="mx-1.5">·</span> : null}
                    {template.description}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <Tabs defaultValue="preview" className="flex-1 flex flex-col min-h-0">
              <div className="px-6 pt-3 pb-0 border-b border-border bg-muted/10">
                <TabsList className="bg-transparent p-0 h-auto gap-1">
                  <TabsTrigger
                    value="preview"
                    className="data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none border-b-2 border-transparent px-3 py-1.5 text-sm"
                  >
                    Preview
                  </TabsTrigger>
                  <TabsTrigger
                    value="structure"
                    className="data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none border-b-2 border-transparent px-3 py-1.5 text-sm"
                  >
                    Structure
                  </TabsTrigger>
                  <TabsTrigger
                    value="info"
                    className="data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none border-b-2 border-transparent px-3 py-1.5 text-sm"
                  >
                    Info
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="preview" className="flex-1 min-h-0 m-0 data-[state=inactive]:hidden">
                <ScrollArea className="h-full">
                  <div className="px-6 py-5">
                    <TemplatePagePreview json={template.json} />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="structure" className="flex-1 min-h-0 m-0 data-[state=inactive]:hidden">
                <ScrollArea className="h-full">
                  <div className="px-6 py-5">
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      {tree ? (
                        <TreeNode node={tree} />
                      ) : (
                        <div className="text-xs text-muted-foreground italic py-1">
                          (template JSON has no root page — open the editor to inspect)
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="info" className="flex-1 min-h-0 m-0 data-[state=inactive]:hidden">
                <ScrollArea className="h-full">
                  <InfoTab stats={stats} template={template} />
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <DialogFooter className="px-6 py-3 border-t border-border bg-muted/10 shrink-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              {onEdit && (
                <Button onClick={onEdit}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit template
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
