"use client";

/** ChatGPTConnectButton — "Sign in with ChatGPT" (OpenAI Codex) BYOK.
 *
 *  ⚠️ ToS: rides the user's ChatGPT subscription via OpenAI's unofficial
 *  Codex CLI device-auth flow (see convex/_shared/codexLib.ts). Grey-area,
 *  opt-in. Drives the two-step device-code UX: request a code, show it +
 *  the verification link, then poll until the backend stores the token
 *  bundle. The reactive `aiKeys.list.mine` query refreshes the key list on
 *  its own once the row lands. */

import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { toast } from "sonner";
import { MessageSquareText, ExternalLink, Loader2 } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Button } from "@/shared/ui/button";
import {
  ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogFooter,
  ResponsiveDialogHeader, ResponsiveDialogTitle,
} from "@/shared/ui/responsive-dialog";

type Status = "idle" | "starting" | "waiting" | "done" | "error";

export function ChatGPTConnectButton() {
  const start = useAction(api.aiKeys.codex.startCodexLogin);
  const poll = useAction(api.aiKeys.codex.pollCodexLogin);

  const [open, setOpen] = useState(false);
  const [userCode, setUserCode] = useState("");
  const [verifyUrl, setVerifyUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errMsg, setErrMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  // Clear any in-flight poll loop on unmount.
  useEffect(() => stopPolling, []);

  const beginConnect = async () => {
    setStatus("starting");
    setErrMsg("");
    setOpen(true);
    try {
      const r = await start({});
      setUserCode(r.userCode);
      setVerifyUrl(r.verificationUrl);
      setStatus("waiting");
      stopPolling();
      timerRef.current = setInterval(async () => {
        try {
          const res = await poll({});
          if (res.status === "done") {
            stopPolling();
            setStatus("done");
            toast.success("ChatGPT connected");
            setTimeout(() => setOpen(false), 1200);
          }
        } catch (e) {
          stopPolling();
          setStatus("error");
          setErrMsg((e as Error).message);
        }
      }, Math.max(r.intervalMs, 2500));
    } catch (e) {
      setStatus("error");
      setErrMsg((e as Error).message);
    }
  };

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) stopPolling();
  };

  return (
    <>
      <Button variant="outline" onClick={beginConnect}>
        <MessageSquareText className="mr-1 h-3.5 w-3.5" /> Sign in with ChatGPT
      </Button>

      <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Connect ChatGPT</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

          <div className="space-y-3 px-4 py-2 text-sm md:px-0">
            {status === "starting" && (
              <p className="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Requesting a code…
              </p>
            )}

            {(status === "waiting" || status === "done") && (
              <>
                <p className="text-muted-foreground">
                  1. Open the verification page and sign in to your ChatGPT account.
                </p>
                <a
                  href={verifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 break-all text-brand underline"
                >
                  {verifyUrl} <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
                <p className="text-muted-foreground">2. Enter this code when prompted:</p>
                <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-center font-mono text-lg tracking-[0.3em]">
                  {userCode}
                </div>
                {status === "waiting" && (
                  <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for authorization…
                  </p>
                )}
                {status === "done" && (
                  <p className="text-xs text-success">
                    Connected. Pick a ChatGPT model in the AI console.
                  </p>
                )}
                <p className="border-t border-border pt-2 text-[11px] text-muted-foreground/70">
                  Uses your ChatGPT subscription via OpenAI&apos;s Codex sign-in — an
                  unofficial integration you opted into. No API key is stored.
                </p>
              </>
            )}

            {status === "error" && (
              <p className="text-xs text-destructive">{errMsg || "Something went wrong — try again."}</p>
            )}
          </div>

          <ResponsiveDialogFooter>
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>Close</Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
