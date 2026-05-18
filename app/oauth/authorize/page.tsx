"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";

/** OAuth 2.1 consent screen for ChatGPT custom MCP apps.
 *  Reads ChatGPT's connector form redirect params, surfaces them for
 *  admin review, mints a single-use code, bounces back to redirect_uri. */

type Params = {
  responseType: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string;
  scope: string;
  resource: string;
};

const REDIRECT_ALLOWLIST = ["chatgpt.com", "chat.openai.com", "platform.openai.com"];

const parseParams = (search: URLSearchParams): Params => ({
  responseType: search.get("response_type") ?? "",
  clientId: search.get("client_id") ?? "",
  redirectUri: search.get("redirect_uri") ?? "",
  codeChallenge: search.get("code_challenge") ?? "",
  codeChallengeMethod: search.get("code_challenge_method") ?? "",
  state: search.get("state") ?? "",
  scope: search.get("scope") ?? "",
  resource: search.get("resource") ?? "",
});

const validate = (p: Params): string | null => {
  if (p.responseType !== "code") return "Unsupported response_type (must be 'code')";
  if (!p.clientId) return "Missing client_id";
  if (!p.redirectUri) return "Missing redirect_uri";
  let parsed: URL;
  try { parsed = new URL(p.redirectUri); } catch { return "redirect_uri is not a valid URL"; }
  if (parsed.protocol !== "https:") return "redirect_uri must be HTTPS";
  const hostAllowed = REDIRECT_ALLOWLIST.some(
    (h) => parsed.hostname === h || parsed.hostname.endsWith("." + h),
  );
  if (!hostAllowed) {
    return `redirect_uri host "${parsed.hostname}" not in allowlist (chatgpt.com / chat.openai.com / platform.openai.com). Possible phishing — do NOT Allow.`;
  }
  if (!p.codeChallenge) return "Missing code_challenge";
  if (p.codeChallengeMethod !== "S256") return "code_challenge_method must be S256";
  return null;
};

export default function OAuthAuthorizePage() {
  const search = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.users.getMe, isAuthenticated ? {} : "skip");
  const createCode = useMutation(api.oauth.mutations.createCode);

  const params = useMemo(() => parseParams(new URLSearchParams(search?.toString() ?? "")), [search]);
  const error = useMemo(() => validate(params), [params]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const here = typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/oauth/authorize";
      router.replace(`/auth?next=${encodeURIComponent(here)}`);
    }
  }, [isLoading, isAuthenticated, router]);

  const allow = async () => {
    if (busy || error) return;
    setBusy(true);
    try {
      const res = await createCode({
        codeChallenge: params.codeChallenge,
        codeChallengeMethod: params.codeChallengeMethod,
        redirectUri: params.redirectUri,
        clientId: params.clientId,
        scope: params.scope || undefined,
        resource: params.resource || undefined,
      });
      const url = new URL(params.redirectUri);
      url.searchParams.set("code", res.code);
      if (params.state) url.searchParams.set("state", params.state);
      window.location.replace(url.toString());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Authorize gagal");
      setBusy(false);
    }
  };

  const deny = () => {
    if (!params.redirectUri) { router.replace("/dashboard"); return; }
    try {
      const url = new URL(params.redirectUri);
      url.searchParams.set("error", "access_denied");
      if (params.state) url.searchParams.set("state", params.state);
      window.location.replace(url.toString());
    } catch {
      router.replace("/dashboard");
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Memeriksa sesi…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="w-full max-w-lg border border-border rounded-lg shadow-lg bg-card">
        <div className="border-b border-border p-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">OAuth · ChatGPT App</p>
          <h1 className="mt-2 text-xl font-semibold">Beri akses ke aplikasi eksternal?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Aplikasi <strong>{params.clientId || "(tidak diketahui)"}</strong> minta akses
            ke workspace Nosion kamu. Akses berlaku 1 tahun sampai kamu revoke manual
            dari Admin → MCP Tokens.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {error ? (
            <div className="border border-destructive rounded-md bg-destructive/10 px-4 py-3 text-xs text-destructive">
              {error}
            </div>
          ) : (
            <>
              <dl className="text-sm grid gap-2 sm:grid-cols-[140px_1fr]">
                <dt className="text-muted-foreground">Logged in as</dt>
                <dd className="font-medium">{me?.email ?? me?.displayName ?? "—"}</dd>
                <dt className="text-muted-foreground">Redirect</dt>
                <dd className="break-all font-mono text-xs">{params.redirectUri}</dd>
                {params.resource && (
                  <>
                    <dt className="text-muted-foreground">Resource</dt>
                    <dd className="break-all font-mono text-xs">{params.resource}</dd>
                  </>
                )}
                {params.scope && (
                  <>
                    <dt className="text-muted-foreground">Scope</dt>
                    <dd className="font-mono text-xs">{params.scope}</dd>
                  </>
                )}
                <dt className="text-muted-foreground">PKCE</dt>
                <dd className="font-mono text-xs">
                  {params.codeChallengeMethod} · {params.codeChallenge.slice(0, 16)}…
                </dd>
              </dl>

              <div className="border border-border rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                Sekali allow, aplikasi bisa <strong>read / create / update</strong> pages
                dan databases lewat MCP tools (pages_list, pages_search, pages_get,
                pages_create, pages_append_markdown). Kamu bertanggung jawab atas
                action yang aplikasi lakukan.
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={deny} disabled={busy}>Deny</Button>
                <Button onClick={allow} disabled={busy}>
                  {busy ? "Authorizing…" : "Allow"}
                </Button>
              </div>
            </>
          )}

          <div className="pt-4 border-t border-border text-xs text-muted-foreground">
            <Link href="/dashboard" className="underline underline-offset-4">
              ← Kembali ke dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
