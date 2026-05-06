"use client";

import * as React from "react";

/** Mount inside `/share/[id]` so the page picks up the visitor's system
 *  preference. Dashboard already toggles `.dark` via DashboardShell;
 *  the share route lives outside it. */
export function ShareThemeBoot() {
  React.useEffect(() => {
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.classList.toggle("dark", m.matches);
    apply();
    m.addEventListener("change", apply);
    return () => {
      m.removeEventListener("change", apply);
      // Don't strip — leaving the class avoids flash if the visitor opens
      // the dashboard in the same tab.
    };
  }, []);
  return null;
}
