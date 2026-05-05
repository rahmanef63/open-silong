import { toast } from "sonner";
import { reportError, type SanitizedError } from "@/shared/lib/error";

const SHOWN: Map<string, number> = new Map();
const TOAST_COOLDOWN_MS = 4_000;

/** Wrap a Convex mutation call (or any thenable) so failures don't surface
 *  raw error text to users. Logs the raw error in dev, shows a sanitized
 *  toast in all envs.
 *
 *  Coalesces repeat toasts of the same category within a short window —
 *  otherwise typing into a broken connection would burst dozens of
 *  identical toasts.
 *
 *  Returns the original promise so awaiters still get the result/throw. */
export function guardMut<T>(scope: string, p: Promise<T>): Promise<T> {
  return p.catch((err) => {
    const safe: SanitizedError = reportError(scope, err);
    showToastIfFresh(scope, safe);
    throw err; // re-throw so callers can decide to compensate / abort UI flows
  });
}

/** Same as guardMut but swallows the error — for fire-and-forget calls
 *  where we never want the rejection to bubble (background saves, recents,
 *  preferences). */
export function guardMutVoid(scope: string, p: Promise<unknown>): void {
  p.catch((err) => {
    const safe = reportError(scope, err);
    showToastIfFresh(scope, safe);
  });
}

function showToastIfFresh(scope: string, safe: SanitizedError) {
  const key = `${scope}:${safe.category}`;
  const last = SHOWN.get(key) ?? 0;
  const now = Date.now();
  if (now - last < TOAST_COOLDOWN_MS) return;
  SHOWN.set(key, now);
  // chunk-load is handled by ChunkErrorBoundary + VersionWatcher already
  if (safe.category === "chunk") return;
  toast.error(safe.message);
}
