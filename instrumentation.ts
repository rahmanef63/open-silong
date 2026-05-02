/**
 * Next.js 16 instrumentation hook. Wired for OTel + structured error
 * reporting. Logs route to Dokploy stdout for now; swap in
 * @vercel/otel or your collector when ready.
 */

export async function register() {
  // Placeholder for OTel SDK init — keep light to not slow cold start.
}

export const onRequestError: import("next/dist/server/instrumentation/types").NextRequestErrorHandler = (
  err,
  request,
  context,
) => {
  const e = err as Error;
  console.error(
    JSON.stringify({
      level: "error",
      msg: "request_error",
      message: e?.message ?? String(err),
      stack: e?.stack,
      route: request.path,
      method: request.method,
      digest: (e as any)?.digest,
      renderSource: context.renderSource,
      revalidateReason: context.revalidateReason,
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
    }),
  );
};
