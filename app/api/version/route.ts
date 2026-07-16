import { NextResponse, connection } from "next/server";

/** Always-fresh build identifier. The client polls this and triggers a
 *  reload prompt when the value differs from the build it loaded with.
 *  Cache headers are explicit to defeat any intermediate proxy.
 *  `connection()` forces per-request rendering under cacheComponents (the
 *  segment-config `dynamic`/`revalidate` opt-outs are no longer allowed). */
export async function GET() {
  await connection();
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID || "unknown";
  return NextResponse.json(
    { buildId, deployedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );
}
