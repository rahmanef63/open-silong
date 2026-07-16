import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { AppProviders } from "./AppProviders";

/** Authenticated route group: landing (/), /auth, /setup, /oauth, /dashboard/*.
 *  The cookie-reading ConvexAuthNextjsServerProvider lives HERE, not in the
 *  root layout, so it no longer forces public /share·/site·/forms to render
 *  dynamically and blocks static/PPR caching. Route groups don't change URLs. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <AppProviders>{children}</AppProviders>
    </ConvexAuthNextjsServerProvider>
  );
}
