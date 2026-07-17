"use client";

import * as React from "react";

/** Optional portal target for overlay primitives (Popover / DropdownMenu).
 *
 *  Radix overlays portal to `document.body` by default. Inside a MODAL
 *  container (e.g. a vaul Drawer / Radix Dialog), body-portaled content is
 *  marked inert (`pointer-events:none` + aria-hidden), so a nested submenu
 *  renders outside the modal and appears dead/invisible. Wrap the modal's
 *  body in `<PortalContainerProvider value={contentEl}>` and the overlays
 *  will portal INTO it — inside the focus scope + stacking context.
 *
 *  `null` (the default, outside any provider) = portal to body as usual. */
const PortalContainerContext = React.createContext<HTMLElement | null>(null);

export const PortalContainerProvider = PortalContainerContext.Provider;

export function usePortalContainer(): HTMLElement | null {
  return React.useContext(PortalContainerContext);
}
