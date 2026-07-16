import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/dialog";
import { Switch } from "@/shared/ui/switch";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Page } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { Copy, Globe, Lock, ExternalLink, Check, UserPlus, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";
import { useAsyncError } from "@/shared/hooks/useAsyncError";

// Boundary cast (see CLAUDE.md): domain ids are `string`; Convex args are
// branded. Keep the cast surface local + grep-able.
const asPageId = (s: string): Id<"pages"> => s as Id<"pages">;

type GrantRole = "viewer" | "editor";
const ROLE_LABEL: Record<GrantRole, string> = { viewer: "Can view", editor: "Can edit" };

export function ShareDialog({ open, onOpenChange, page }: { open: boolean; onOpenChange: (o: boolean) => void; page: Page }) {
  const { togglePublic } = useStore();
  const setShareSlug = useMutation(api.pages.setShareSlug);
  const setShareIndexable = useMutation(api.pages.setShareIndexable);
  const grantAccess = useMutation(api.pageGrants.grant);
  const revokeAccess = useMutation(api.pageGrants.revoke);
  const grants = useQuery(api.pageGrants.list, { pageId: asPageId(page.id) });
  const [copied, setCopied] = useState(false);
  const [slugDraft, setSlugDraft] = useState(page.shareSlug ?? "");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<GrantRole>("viewer");
  const slugSave = useAsyncError("ShareDialog.setSlug");
  const indexableSave = useAsyncError("ShareDialog.indexable");
  const grantSave = useAsyncError("ShareDialog.grant");
  const revokeSave = useAsyncError("ShareDialog.revoke");
  const slugForUrl = page.shareSlug || page.id;
  const url = `${window.location.origin}/share/${slugForUrl}`;

  const addPerson = async () => {
    const target = email.trim().toLowerCase();
    if (!target || grantSave.pending) return;
    const ok = await grantSave.execute(async () => {
      const res = await grantAccess({ pageId: asPageId(page.id), email: target, role });
      toast.success(res.updated ? `Updated access for ${target}` : `Shared with ${target}`);
      return true;
    });
    if (ok) setEmail("");
  };

  const revokePerson = (userId: Id<"users">, label: string) =>
    revokeSave.execute(async () => {
      await revokeAccess({ pageId: asPageId(page.id), userId });
      toast.success(`Removed ${label}`);
    });

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
      await setShareSlug({ pageId: page.id as Id<"pages">, slug: next });
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
              <Input value={url} readOnly className="h-8 flex-1 border-0 bg-transparent text-sm" onFocus={e => e.currentTarget.select()} />
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
              <Input
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
                className="h-8 flex-1 rounded-l-none bg-card text-sm"
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
                disabled={indexableSave.pending}
                onCheckedChange={(v) => {
                  void indexableSave.execute(async () => {
                    await setShareIndexable({ pageId: page.id as Id<"pages">, indexable: v });
                  });
                }}
              />
            </div>
          )}

          {page.isPublic && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-brand hover:underline">
              <ExternalLink className="h-3 w-3" /> Open shared view
            </a>
          )}

          <div className="border-t border-border pt-4">
            <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
              People with access
            </label>
            <form
              className="mt-2 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void addPerson();
              }}
            >
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="h-8 flex-1 text-sm"
              />
              <Select value={role} onValueChange={(v) => setRole(v as GrantRole)}>
                <SelectTrigger className="h-8 w-[112px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">{ROLE_LABEL.viewer}</SelectItem>
                  <SelectItem value="editor">{ROLE_LABEL.editor}</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" size="sm" disabled={grantSave.pending || !email.trim()}>
                <UserPlus className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            </form>

            <div className="mt-3 space-y-1">
              {grants === undefined ? (
                <div className="py-1 text-xs text-muted-foreground">Loading…</div>
              ) : grants.length === 0 ? (
                <div className="py-1 text-xs text-muted-foreground">
                  No one has been invited yet. Add someone by email above.
                </div>
              ) : (
                grants.map((g) => {
                  const label = g.name || g.email || "Unknown user";
                  return (
                    <div
                      key={g._id}
                      className="flex items-center justify-between gap-2 rounded-md px-1 py-1 hover:bg-muted/40"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">
                            {label.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate text-sm">{label}</div>
                          {g.name && g.email && (
                            <div className="truncate text-xs text-muted-foreground">{g.email}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {ROLE_LABEL[g.role as GrantRole]}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          disabled={revokeSave.pending}
                          onClick={() => void revokePerson(g.userId, label)}
                          aria-label={`Remove ${label}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
