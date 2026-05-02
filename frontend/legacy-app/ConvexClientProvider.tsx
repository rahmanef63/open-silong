"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { type ReactNode, useState } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [convex] = useState(
    () => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL as string),
  );
  return <ConvexAuthNextjsProvider client={convex}>{children}</ConvexAuthNextjsProvider>;
}
