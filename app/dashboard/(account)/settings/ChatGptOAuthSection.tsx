"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { toast } from "sonner";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/shared/ui/button";

/** Per-user OAuth-token panel — connect ChatGPT custom app to YOUR
 *  Nosion workspace. Token scoped to current user; MCP route resolves
 *  bearer → userId, so each user only sees + acts on their own pages. */

type Row = {
  _id: Id<"oauthAccessTokens">;
  tokenPreview: string;
  userId: string;
  clientId: string;
  scope: string | null;
  resource: string | null;
  expiresAt: number;
  createdAt: number;
  lastUsedAt: number | null;
  revokedAt: number | null;
  label: string | null;
};

const SITE = "https://nosion.rahmanef.com";
const MCP = "https://api-notion-page-clone.rahmanef.com/mcp";

type Field = { label: string; value: string; copyable: boolean; hint?: string };
type Group = { title: string; fields: Field[] };

const GROUPS: Group[] = [
  {
    title: "Connection",
    fields: [
      { label: "MCP Server URL", value: MCP, copyable: true },
      { label: "Authentication", value: "OAuth", copyable: false, hint: "pilih dari dropdown" },
      { label: "Registration method", value: "User-Defined OAuth Client", copyable: false, hint: "pilih dari dropdown" },
    ],
  },
  {
    title: "OAuth Client",
    fields: [
      { label: "OAuth Client ID", value: "chatgpt-nosion", copyable: true, hint: "bebas — string apa pun" },
      { label: "OAuth Client Secret", value: "(leave empty)", copyable: false, hint: "public client — kosongkan" },
      { label: "Token endpoint auth method", value: "none", copyable: false },
    ],
  },
  {
    title: "Endpoints",
    fields: [
      { label: "Auth URL", value: `${SITE}/oauth/authorize`, copyable: true },
      { label: "Token URL", value: `${SITE}/api/oauth/token`, copyable: true },
      { label: "Authorization server base", value: SITE, copyable: true },
      { label: "Resource", value: MCP, copyable: true },
    ],
  },
  {
    title: "Optional",
    fields: [
      { label: "Registration URL", value: "(leave empty)", copyable: false, hint: "DCR tidak diadvertise" },
      { label: "Scope", value: "(leave empty)", copyable: false, hint: "mcp.read mcp.write tersedia" },
    ],
  },
];

const formatTime = (ms: number | null): string => {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const status = (r: Row): "active" | "expired" | "revoked" => {
  if (r.revokedAt) return "revoked";
  if (r.expiresAt < Date.now()) return "expired";
  return "active";
};

const STATUS_CLS: Record<ReturnType<typeof status>, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  expired: "bg-muted text-muted-foreground border-border",
  revoked: "bg-destructive/10 text-destructive border-destructive/30",
};

function CopyRow({ field }: { field: Field }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!field.copyable) return;
    try {
      await navigator.clipboard.writeText(field.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      toast.success(`${field.label} copied`, { id: `copy-${field.label}` });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clipboard tidak tersedia");
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-2 sm:gap-3 items-start">
      <div className="flex flex-col">
        <span className="text-xs font-medium text-foreground">{field.label}</span>
        {field.hint && <span className="text-[10px] text-muted-foreground">{field.hint}</span>}
      </div>
      <button
        type="button"
        onClick={onCopy}
        disabled={!field.copyable}
        title={field.copyable ? "Click to copy" : "Informational only"}
        className={`group flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition-colors ${
          field.copyable
            ? "border-border bg-background hover:border-foreground/40 hover:bg-muted/50 cursor-pointer"
            : "border-border/50 bg-muted/20 cursor-default"
        }`}
      >
        <code className="text-xs font-mono break-all text-foreground/90">{field.value}</code>
        {field.copyable && (
          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] uppercase text-muted-foreground group-hover:text-foreground">
            {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
            {copied ? "copied" : "copy"}
          </span>
        )}
      </button>
    </div>
  );
}

function GroupCard({ group }: { group: Group }) {
  const copyAll = async () => {
    const text = group.fields
      .filter((f) => f.copyable)
      .map((f) => `${f.label}: ${f.value}`)
      .join("\n");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${group.title} copied`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clipboard tidak tersedia");
    }
  };
  const copyableCount = group.fields.filter((f) => f.copyable).length;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.title}</h4>
        {copyableCount > 0 && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={copyAll}>
            <Copy className="size-3 mr-1" /> Copy group
          </Button>
        )}
      </div>
      <div className="p-4 space-y-3">
        {group.fields.map((f) => <CopyRow key={f.label} field={f} />)}
      </div>
    </div>
  );
}

function CopyAllJson() {
  const onClick = async () => {
    const dump: Record<string, string> = {};
    for (const g of GROUPS) for (const f of g.fields) if (f.copyable) dump[f.label] = f.value;
    try {
      await navigator.clipboard.writeText(JSON.stringify(dump, null, 2));
      toast.success("Semua field di-copy sebagai JSON");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clipboard tidak tersedia");
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <Copy className="size-3 mr-1" /> Copy all fields as JSON
    </Button>
  );
}

export function ChatGptOAuthSection() {
  const rows = useQuery(api.oauth.queries.listMine, {}) as Row[] | undefined;
  const revoke = useMutation(api.oauth.mutations.revokeToken);

  const onRevoke = async (id: Id<"oauthAccessTokens">, label: string) => {
    if (!window.confirm(`Revoke "${label}"? Aplikasi yang pakai token ini langsung kehilangan akses.`)) return;
    try {
      await revoke({ id });
      toast.success("Token revoked");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Revoke gagal");
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Hubungkan workspace kamu ke ChatGPT custom app via OAuth 2.1 + PKCE.
          Token yang di-mint scoped ke akun kamu — ChatGPT cuma bisa lihat /
          edit page kamu, bukan user lain.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold">1</span>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Buka ChatGPT → Settings → Connectors → New App</p>
            <p className="text-xs text-muted-foreground">
              Authentication = OAuth, Registration method = User-Defined OAuth Client.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold">2</span>
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">Paste field-field ini</p>
              <CopyAllJson />
            </div>
            <p className="text-xs text-muted-foreground">
              Field abu-abu (kosongkan) tinggal diabaikan. Field putih = tap untuk copy.
            </p>
          </div>
        </div>
        <div className="ml-10 grid gap-3">
          {GROUPS.map((g) => <GroupCard key={g.title} group={g} />)}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold">3</span>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Klik Create → Connect → Allow di consent page</p>
            <p className="text-xs text-muted-foreground">
              ChatGPT akan redirect ke <code className="text-xs">/oauth/authorize</code>.
              Review params, klik Allow. Token aktif 1 tahun setelahnya — muncul di
              table di bawah.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <a
                href="/.well-known/oauth-authorization-server"
                target="_blank" rel="noopener"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                <ExternalLink className="size-3" /> /.well-known/oauth-authorization-server
              </a>
              <a
                href="/.well-known/oauth-protected-resource"
                target="_blank" rel="noopener"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                <ExternalLink className="size-3" /> /.well-known/oauth-protected-resource
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Token saya</h3>
        {rows === undefined ? (
          <div className="border border-border rounded-lg p-6 text-sm text-muted-foreground">Memuat…</div>
        ) : rows.length === 0 ? (
          <div className="border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
            Belum ada token. Connect ChatGPT custom app untuk mint token pertama.
          </div>
        ) : (
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium">Label / Client</th>
                  <th className="px-3 py-3 text-left text-xs font-medium">Token</th>
                  <th className="px-3 py-3 text-left text-xs font-medium">Dibuat</th>
                  <th className="px-3 py-3 text-left text-xs font-medium">Last used</th>
                  <th className="px-3 py-3 text-left text-xs font-medium">Expires</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const s = status(r);
                  return (
                    <tr key={r._id} className="align-top">
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${STATUS_CLS[s]}`}>
                          {s}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-sm">{r.label ?? "—"}</div>
                        <div className="text-xs text-muted-foreground font-mono">{r.clientId}</div>
                        {r.scope && <div className="text-[10px] text-muted-foreground mt-0.5">scope: {r.scope}</div>}
                      </td>
                      <td className="px-3 py-3"><code className="text-xs font-mono">{r.tokenPreview}</code></td>
                      <td className="px-3 py-3 text-xs text-muted-foreground tabular-nums">{formatTime(r.createdAt)}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground tabular-nums">{formatTime(r.lastUsedAt)}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground tabular-nums">{formatTime(r.expiresAt)}</td>
                      <td className="px-3 py-3 text-right">
                        {s === "active" ? (
                          <Button size="sm" variant="destructive" className="h-7 px-2 text-[10px]" onClick={() => onRevoke(r._id, r.label ?? r.clientId)}>
                            Revoke
                          </Button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
