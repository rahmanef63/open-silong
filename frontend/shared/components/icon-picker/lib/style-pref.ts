"use client";

import { useEffect, useState } from "react";

const KEY = "nosion:iconStyle";
type Style = "twemoji" | "native";

function read(): Style {
  if (typeof window === "undefined") return "twemoji";
  return (localStorage.getItem(KEY) as Style) || "twemoji";
}

/** Per-device preference for emoji rendering. Default: twemoji (consistent
 *  Notion-like SVG); user can switch to "native" (OS font) for offline use. */
export function useIconStyle(): [Style, (next: Style) => void] {
  const [style, setStyle] = useState<Style>("twemoji");
  useEffect(() => { setStyle(read()); }, []);
  useEffect(() => {
    function onStorage(e: StorageEvent) { if (e.key === KEY) setStyle(read()); }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const update = (next: Style) => {
    setStyle(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(KEY, next);
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    }
  };
  return [style, update];
}
