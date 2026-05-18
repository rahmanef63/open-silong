"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";

/** Admin view of issued OAuth access tokens (ChatGPT MCP connector etc).
 *  Token material never leaves Convex — only previews are wired here.
 *  See `convex/oauth/queries.ts:adminList`. */

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

const SETUP_FIELDS: { label: string; value: string; copyable?: boolean }[] = [
  { label: "MCP Server URL", value: MCP, copyable: true },
  { label: "Authentication", value: "OAuth" },
  { label: "Registration method", value: "User-Defined OAuth Client" },
  { label: "OAuth Client ID", value: "chatgpt-nosion", copyable: true },
  { label: "OAuth Client Secret", value: "(leave empty — public client)" },
  { label: "Token endpoint auth method", value: "none" },
  { label: "Auth URL", value: `${SITE}/oauth/authorize`, copyable: true },
  { label: "Token URL", value: `${SITE}/api/oauth/token`, copyable: true },
  { label: "Registration URL", value: "(leave empty)" },
  { label: "Authorization server base", value: SITE, copyable: true },
  { label: "Resource", value: MCP, copyable: true },
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

export function OAuthPanel() {
  const rows = useQuery(api.oauth.queries.adminList, {}) as Row[] | undefined;
  const revoke = useMutation(api.oauth.mutations.revokeToken);
  const [setupOpen, setSetupOpen] = useState(true);

  const onRevoke = async (id: Id<"oauthAccessTokens">, label: string) => {
    if (!window.confirm(`Revoke token "${label}"? Aplikasi yang pakai akan kehilangan akses.`)) return;
    try {
      await revoke({ id });
      toast.success("Token revoked");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Revoke gagal");
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clipboard tidak tersedia");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">MCP &amp; OAuth Tokens</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Token yang sudah di-mint dari ChatGPT custom app (OAuth flow di{" "}
          <code className="text-xs">/oauth/authorize</code>), atau via MCP_API_KEY env
          (developer fallback). Revoke kapan saja untuk cabut akses.
        </p>
      </div>

      {/* Setup guide */}
      <section className="border border-border rounded-lg bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setSetupOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 border-b border-border hover:bg-muted/40 transition-colors"
          aria-expanded={setupOpen}
        >
          <span className="text-sm font-semibold">Setup ChatGPT Custom App</span>
          <span className="text-xs text-muted-foreground">{setupOpen ? "▼ Hide" : "▶ Show"}</span>
        </button>
        {setupOpen && (
          <div className="p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Paste values berikut ke form ChatGPT (Settings → Connectors → New App).
              Authentication = OAuth.
            </p>
            <dl className="grid gap-2 sm:grid-cols-[180px_1fr]">
              {SETUP_FIELDS.map((f) => (
                <div key={f.label} className="contents">
                  <dt className="text-xs text-muted-foreground py-1.5">{f.label}</dt>
                  <dd className="flex items-center justify-between gap-2 border border-border rounded-md bg-background px-3 py-1.5">
                    <code className="text-xs font-mono break-all">{f.value}</code>
                    {f.copyable && (
                      <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] shrink-0" onClick={() => copy(f.value)}>
                        Copy
                      </Button>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="pt-3 border-t border-border space-y-1 text-xs text-muted-foreground">
              <p>
                Discovery JSON (kalau ChatGPT auto-fill):{" "}
                <a href="/.well-known/oauth-authorization-server" className="underline underline-offset-4" target="_blank" rel="noopener">
                  /.well-known/oauth-authorization-server
                </a>
                {" · "}
                <a href="/.well-known/oauth-protected-resource" className="underline underline-offset-4" target="_blank" rel="noopener">
                  /.well-known/oauth-protected-resource
                </a>
              </p>
              <p>Token aktif 1 tahun setelah Allow. Revoke → next call 401.</p>
            </div>
          </div>
        )}
      </section>

      {/* Tokens table */}
      {rows === undefined ? (
        <div className="border border-border rounded-lg p-6 text-sm text-muted-foreground">Memuat…</div>
      ) : rows.length === 0 ? (
        <div className="border border-border rounded-lg p-8 text-center text-muted-foreground">
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
                    <td className="px-3 py-3">
                      <code className="text-xs font-mono">{r.tokenPreview}</code>
                    </td>
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

      <section className="border border-border rounded-lg p-4 bg-card text-xs space-y-2">
        <h3 className="text-sm font-semibold">MCP_API_KEY (static fallback)</h3>
        <p className="text-muted-foreground">
          Static bearer untuk smoke test / scripts. Aktif kalau env <code>MCP_API_KEY</code> +{" "}
          <code>MCP_USER_ID</code> diset di Convex deployment. Tidak muncul di table di atas.
          Cabut: <code>npx convex env unset MCP_API_KEY</code>.
        </p>
      </section>
    </div>
  );
}
