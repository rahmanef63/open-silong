/** Connection hints for PWA / cold-start performance.
 *
 *  Renders `<link rel="dns-prefetch">` + `<link rel="preconnect">`
 *  for the Convex backend. Env-driven — no hardcoded host.
 *  Emitted from a Server Component so Next 16's React tree hoists
 *  them into `<head>` automatically.
 */

const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL
  ?? "https://api-notion-page-clone.rahmanef.com";

const convexHost = (() => {
  try { return new URL(CONVEX_URL).origin; } catch { return CONVEX_URL; }
})();

export function HeadHints() {
  return (
    <>
      <link rel="dns-prefetch" href={convexHost} />
      <link rel="preconnect" href={convexHost} crossOrigin="anonymous" />
    </>
  );
}
