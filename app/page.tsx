import { redirect } from "next/navigation";

/** No marketing landing — this deployment IS the workspace. Anonymous
 *  visitors get bounced by proxy.ts to /auth (sign-up = first step of
 *  /setup); signed-in users land straight in the dashboard. The old
 *  landing page lives in git history (pre-2026-06-04). */
export default function Home() {
  redirect("/dashboard");
}
