import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/dialog";
import { Switch } from "@/shared/ui/switch";
import { Page } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { Copy, Globe, Lock, ExternalLink } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";

export function ShareDialog({ open, onOpenChange, page }: { open: boolean; onOpenChange: (o: boolean) => void; page: Page }) {
  const { togglePublic } = useStore();
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/share/${page.id}`;
  const editUrl = `${window.location.origin}/p/${page.id}`;

  const copy = async (s: string) => {
    try {
      await navigator.clipboard.writeText(s);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">{page.icon}</span> Share "{page.title || "Untitled"}"
          </DialogTitle>
          <DialogDescription>Share this page with anyone using a link.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              {page.isPublic ? <Globe className="h-5 w-5 text-success" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
              <div>
                <div className="text-sm font-medium">{page.isPublic ? "Public to web" : "Private"}</div>
                <div className="text-xs text-muted-foreground">
                  {page.isPublic ? "Anyone with the link can view" : "Only you can see this page"}
                </div>
              </div>
            </div>
            <Switch checked={!!page.isPublic} onCheckedChange={() => togglePublic(page.id)} />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Share link (read-only)</label>
            <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-muted/30 p-1">
              <input value={url} readOnly className="flex-1 bg-transparent px-2 py-1 text-sm outline-none" onFocus={e => e.currentTarget.select()} />
              <Button size="sm" variant={page.isPublic ? "default" : "secondary"} onClick={() => copy(url)} disabled={!page.isPublic}>
                <Copy className="h-3.5 w-3.5 mr-1" /> {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            {!page.isPublic && (
              <p className="mt-2 text-xs text-muted-foreground">Enable "Public to web" to make this link work for others.</p>
            )}
          </div>

          {page.isPublic && (
            <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-brand hover:underline">
              <ExternalLink className="h-3 w-3" /> Open shared view
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
