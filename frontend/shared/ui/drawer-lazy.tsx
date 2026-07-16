"use client";

import { lazy } from "react";

// Lazy so `vaul` (~11KB gzip, desktop-unused) leaves the first-load bundle.
// The drawer only ever renders on mobile; `drawer.tsx` — the sole vaul
// importer — becomes an async chunk fetched when a Drawer first mounts.
// Consumers wrap the drawer-mode subtree in <Suspense fallback={null}>.
// Mirrors WorkspaceIOProvider's lazy-on-mount pattern.
const load = () => import("./drawer");

export const Drawer = lazy(() =>
  load().then((m) => ({ default: m.Drawer })),
);
export const DrawerTrigger = lazy(() =>
  load().then((m) => ({ default: m.DrawerTrigger })),
);
export const DrawerClose = lazy(() =>
  load().then((m) => ({ default: m.DrawerClose })),
);
export const DrawerContent = lazy(() =>
  load().then((m) => ({ default: m.DrawerContent })),
);
export const DrawerHeader = lazy(() =>
  load().then((m) => ({ default: m.DrawerHeader })),
);
export const DrawerFooter = lazy(() =>
  load().then((m) => ({ default: m.DrawerFooter })),
);
export const DrawerTitle = lazy(() =>
  load().then((m) => ({ default: m.DrawerTitle })),
);
export const DrawerDescription = lazy(() =>
  load().then((m) => ({ default: m.DrawerDescription })),
);
