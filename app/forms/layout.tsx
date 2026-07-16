"use client";

import { useState, type ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { FilesAdapterProvider } from "@/slices/files";
import { useConvexFilesAdapter } from "@/slices/files/adapter/convexAdapter";

function FilesProvider({ children }: { children: ReactNode }) {
  const adapter = useConvexFilesAdapter();
  return <FilesAdapterProvider adapter={adapter}>{children}</FilesAdapterProvider>;
}

/** Public form routes are anonymous but DO need a Convex client — PublicFormClient
 *  submits via useMutation and PropertyFormInput may render file inputs. A plain
 *  ConvexProvider (no cookie-reading auth server provider) is enough, so /forms
 *  stays out of the authenticated group while keeping its client. Theme / error
 *  boundaries / toaster come from the root RootProviders. */
export default function FormsLayout({ children }: { children: ReactNode }) {
  const [convex] = useState(
    () => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL as string),
  );
  return (
    <ConvexProvider client={convex}>
      <FilesProvider>{children}</FilesProvider>
    </ConvexProvider>
  );
}
