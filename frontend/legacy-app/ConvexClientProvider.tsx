import { ConvexReactClient } from "convex/react";
import { ConvexHttpClient } from "convex/browser";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { type ReactNode, useState } from "react";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL as string;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [convex] = useState(() => {
    const client = new ConvexReactClient(CONVEX_URL);
    const http = new ConvexHttpClient(CONVEX_URL);
    const origAction = client.action.bind(client);
    // Route auth actions via HTTP to prevent "Connection lost" on idle proxy timeout
    (client as any).action = (ref: any, args?: any) => {
      const name = (ref as any)?._name ?? String(ref);
      if (typeof name === "string" && name.startsWith("auth:")) {
        return http.action(ref as any, args);
      }
      return origAction(ref, args);
    };
    return client;
  });
  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
