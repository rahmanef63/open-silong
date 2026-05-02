/**
 * Next.js 16 request boundary. Proxies /api/auth/* to Convex auth server,
 * forwards token cookies, and gates protected route groups.
 *
 * NOT the security boundary — Convex queries/mutations enforce authz via
 * getAuthUserId(ctx). proxy.ts is just optimistic redirect + cookie shaping.
 */

import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/auth",
  "/share/:id",
  "/api/auth(.*)",
]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const isSignedIn = await convexAuth.isAuthenticated();

  if (!isSignedIn && !isPublicRoute(request)) {
    return nextjsMiddlewareRedirect(request, "/auth");
  }
  if (isSignedIn && request.nextUrl.pathname === "/auth") {
    return nextjsMiddlewareRedirect(request, "/");
  }
});

export const config = {
  matcher: [
    // Skip Next internals + static assets
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|webmanifest|map)).*)",
    "/(api|trpc)(.*)",
  ],
};
