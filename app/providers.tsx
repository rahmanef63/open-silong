"use client";

import { useState, type ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";

export default function Providers({ children }: { children: ReactNode }) {
  const [convex] = useState(
    () => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL as string),
  );
  return <ConvexAuthNextjsProvider client={convex}>{children}</ConvexAuthNextjsProvider>;
}
