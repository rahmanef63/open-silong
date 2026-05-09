import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/dialog";
import { Switch } from "@/shared/ui/switch";
import { Page } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { DynamicIcon } from "@/slices/icon-picker";
import { Copy, Globe, Lock, ExternalLink, Check } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";
import { useAsyncError } from "@/shared/hooks/useAsyncError";
import { reportError } from "@/shared/lib/error";

export function ShareDialog({ open, onOpenChange, page }: { open: boolean; onOpenChange: (o: boolean) => void; page: Page }) {
  const { togglePublic } = useStore();
  const setShareSlug = useMutation(api.pages.setShareSlug);
  const setShareIndexable = useMutation(api.pages.setShareIndexable);
  const [copied, setCopied] = useState(false);
  const [slugDraft, setSlugDraft] = useState(page.shareSlug ?? "");
  const slugSave = useAsyncError("ShareDialog.setSlug");
  const slugForUrl = page.shareSlug || page.id;
  const url = `${window.location.origin}/share/${slugForUrl}`;

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

  const saveSlug = async () => {
    if (slugSave.pending) return;
    const next = slugDraft.trim().toLowerCase();
    if (next === (page.shareSlug ?? "")) return;
    const ok = await slugSave.execute(async () => {
      await setShareSlug({ pageId: page.id, slug: next });
      toast.success(next ? "Slug updated" : "Slug cleared");
    });
    if (ok === undefined) setSlugDraft(page.shareSlug ?? "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DynamicIcon value={page.icon} className="text-lg" /> Share &quot;{page.title || "Untitled"}&quot;
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
              <p className="mt-2 text-xs text-muted-foreground">Enable &quot;Public to web&quot; to make this link work for others.</p>
            )}
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Custom URL slug</label>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-l-md border border-r-0 border-border bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground">/share/</span>
              <input
                value={slugDraft}
                onChange={(e) => setSlugDraft(e.target.value)}
                onBlur={saveSlug}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.currentTarget as HTMLInputElement).blur();
                  }
                  if (e.key === "Escape") setSlugDraft(page.shareSlug ?? "");
                }}
                placeholder="my-page-slug"
                pattern="[a-z0-9-]{3,60}"
                className="flex-1 rounded-r-md border border-border bg-card px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {slugSave.pending && <Check className="h-4 w-4 animate-pulse text-muted-foreground" />}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Lowercase a–z, digits, hyphens. 3–60 chars. Leave blank to use the
              default id-based URL.
            </p>
          </div>

          {page.isPublic && (
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <div className="text-sm font-medium">Allow search engines</div>
                <div className="text-xs text-muted-foreground">
                  When off, the share emits <code>noindex,nofollow</code> and is excluded from sitemap.xml.
                </div>
              </div>
              <Switch
                checked={!!page.shareIndexable}
                onCheckedChange={async (v) => {
                  try { await setShareIndexable({ pageId: page.id, indexable: v }); }
                  catch (err) { const safe = reportError("ShareDialog.indexable", err); toast.error(safe.message); }
                }}
              />
            </div>
          )}

          {page.isPublic && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-brand hover:underline">
              <ExternalLink className="h-3 w-3" /> Open shared view
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
