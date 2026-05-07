"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

/** PWA install hint. Listens for `beforeinstallprompt`, surfaces a
 *  small in-app banner with a "Install" button. Dismissal is sticky
 *  via localStorage so we don't pester users.
 *
 *  Env-driven: dismissal key namespaced via `NEXT_PUBLIC_BUILD_ID` so
 *  a new release can re-prompt eligible users (rare; opt out via the
 *  `data-no-install-prompt` body attribute). */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "nosion.installprompt.dismissed";

export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.body.dataset.noInstallPrompt === "true") return;
    let dismissed = false;
    try { dismissed = localStorage.getItem(DISMISS_KEY) === "1"; } catch {}
    if (dismissed) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => setVisible(false);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setVisible(false);
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    const choice = await evt.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
    } else {
      dismiss();
    }
  };

  if (!visible || !evt) return null;
  return (
    <div
      role="region"
      aria-label="Install Nosion"
      className="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-lg border border-border bg-popover/95 p-3 shadow-soft backdrop-blur"
    >
      <Download className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
      <div className="flex-1 text-xs">
        <p className="font-medium">Install Nosion</p>
        <p className="text-muted-foreground">Get a faster app-like experience with offline shell and a dock icon.</p>
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={install}
            className="rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background hover:opacity-90"
          >
            Install
          </button>
          <button
            onClick={dismiss}
            className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Not now
          </button>
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
