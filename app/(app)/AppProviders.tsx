"use client";

import { useState, type ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { VersionWatcher } from "@/shared/components/VersionWatcher";
import { FilesAdapterProvider } from "@/slices/files";
import { useConvexFilesAdapter } from "@/slices/files/adapter/convexAdapter";

function FilesProvider({ children }: { children: ReactNode }) {
  // Must mount inside ConvexAuthNextjsProvider — the adapter calls
  // useMutation/useQuery which need the Convex client context.
  const adapter = useConvexFilesAdapter();
  return <FilesAdapterProvider adapter={adapter}>{children}</FilesAdapterProvider>;
}

/** The authenticated realtime stack — Convex client + auth handshake +
 *  version poller + files adapter. Scoped to the (app) route group so
 *  anonymous public routes (/share, /site) never boot a Convex websocket,
 *  auth handshake, or the 5-minute version poll. Theme / error boundaries /
 *  toaster live in RootProviders (app/providers.tsx) and cover every route. */
export function AppProviders({ children }: { children: ReactNode }) {
  const [convex] = useState(
    () => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL as string),
  );
  return (
    <ConvexAuthNextjsProvider client={convex}>
      <VersionWatcher />
      <FilesProvider>{children}</FilesProvider>
    </ConvexAuthNextjsProvider>
  );
}
