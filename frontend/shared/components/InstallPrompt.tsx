"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

/** PWA install hint. Listens for `beforeinstallprompt`, surfaces a
 *  small in-app banner ONCE per browser. After the user dismisses,
 *  installs, or already has the app installed, the banner collapses
 *  to a tiny floating Install button — clickable to re-prompt later,
 *  hidden entirely if the app is already running standalone. */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "nosion.installprompt.dismissed";
const INSTALLED_KEY = "nosion.installprompt.installed";

function isAlreadyInstalled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    // iOS Safari
    if ((navigator as unknown as { standalone?: boolean }).standalone) return true;
    if (localStorage.getItem(INSTALLED_KEY) === "1") return true;
  } catch {}
  return false;
}

export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [iconVisible, setIconVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.body.dataset.noInstallPrompt === "true") return;
    if (isAlreadyInstalled()) return;

    let dismissed = false;
    try { dismissed = localStorage.getItem(DISMISS_KEY) === "1"; } catch {}

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      if (dismissed) {
        // Already dismissed once — surface only the compact icon.
        setIconVisible(true);
      } else {
        // First time — show the banner AND mark dismissed immediately
        // so we never bother the user with the big banner again, even
        // if they ignore it.
        setBannerVisible(true);
        try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
      }
    };
    const onInstalled = () => {
      setBannerVisible(false);
      setIconVisible(false);
      try { localStorage.setItem(INSTALLED_KEY, "1"); } catch {}
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismissBanner = () => {
    setBannerVisible(false);
    setIconVisible(true);
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    const choice = await evt.userChoice;
    if (choice.outcome === "accepted") {
      setBannerVisible(false);
      setIconVisible(false);
      try { localStorage.setItem(INSTALLED_KEY, "1"); } catch {}
    } else {
      dismissBanner();
    }
  };

  if (bannerVisible && evt) {
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
              onClick={dismissBanner}
              className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={dismissBanner}
          aria-label="Dismiss install prompt"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  if (iconVisible && evt) {
    return (
      <button
        type="button"
        onClick={install}
        title="Install Nosion"
        aria-label="Install Nosion"
        className="fixed bottom-4 right-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-popover/95 text-muted-foreground shadow-soft backdrop-blur transition-colors hover:text-foreground hover:border-brand/40"
      >
        <Download className="h-4 w-4" />
      </button>
    );
  }

  return null;
}
