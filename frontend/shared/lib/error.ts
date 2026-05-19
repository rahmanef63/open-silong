/** Error sanitization layer.
 *
 *  Goal: never show raw React/Convex/network stacks to end users. The
 *  user does not know what `useQuery is undefined` or
 *  `[CONVEX M(pages:create)] permission_denied` means. Internally we still
 *  want to see the raw error in dev — so logError() prints to console only
 *  when NODE_ENV !== "production".
 *
 *  Surfaces that should call sanitizeError(): Sonner toasts, error boundary
 *  fallbacks, app/error.tsx, anywhere user-visible. Internal call sites
 *  (Convex action retries, telemetry) should keep getErrorMessage(). */

export type ErrorCategory =
  | "chunk"
  | "network"
  | "auth"
  | "permission"
  | "validation"
  | "not-found"
  | "rate-limit"
  | "server"
  | "convex"
  | "unknown";

export interface SanitizedError {
  category: ErrorCategory;
  /** User-safe message — no stack, no internal identifiers. */
  message: string;
  /** True when reloading is the right next step (chunk / version mismatch). */
  retryable: boolean;
}

/** Extract a human-readable message from an unknown thrown value.
 *  Use in catch blocks to drop `catch (e: any)` typings. */
export function getErrorMessage(err: unknown, fallback = "Unknown error"): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === "string") return m;
  }
  try {
    const s = JSON.stringify(err);
    // JSON.stringify(undefined) returns the value undefined, not the string.
    return typeof s === "string" ? s : fallback;
  } catch {
    return fallback;
  }
}

/** Categorise an unknown error into one of our user-facing buckets and
 *  return a message safe to display in the UI. */
export function sanitizeError(err: unknown): SanitizedError {
  const raw = getErrorMessage(err, "");
  const lower = raw.toLowerCase();
  const name = err && typeof err === "object" && "name" in err
    ? String((err as { name?: unknown }).name ?? "")
    : "";

  if (
    name === "ChunkLoadError" ||
    lower.includes("loading chunk") ||
    lower.includes("failed to load chunk") ||
    lower.includes("loading css chunk") ||
    lower.includes("chunkloaderror") ||
    /\/_next\/static\/chunks\/[^\s]+\.js/i.test(raw)
  ) {
    return { category: "chunk", message: "A new version was deployed. Reload to continue.", retryable: true };
  }
  if (
    name === "AbortError" ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("err_internet_disconnected") ||
    lower.includes("load failed") ||
    lower === "network error"
  ) {
    return { category: "network", message: "Connection problem. Check your internet and try again.", retryable: true };
  }
  if (
    lower.includes("unauthenticated") ||
    lower.includes("not authenticated") ||
    lower.includes("not signed in") ||
    lower.includes("auth required") ||
    lower.includes("invalidaccount") ||
    lower.includes("invalidsecret") ||
    /\b401\b/.test(raw)
  ) {
    return { category: "auth", message: "You're signed out. Please sign in again.", retryable: false };
  }
  if (
    lower.includes("permission_denied") ||
    lower.includes("permission denied") ||
    lower.includes("forbidden") ||
    lower.includes("not allowed") ||
    /\b403\b/.test(raw)
  ) {
    return { category: "permission", message: "You don't have access to do that.", retryable: false };
  }
  if (
    lower.includes("argumentvalidationerror") ||
    lower.includes("validator error") ||
    lower.includes("invalid argument") ||
    lower.includes("zoderror") ||
    name === "ZodError"
  ) {
    return { category: "validation", message: "That input doesn't look right. Please review and try again.", retryable: false };
  }
  if (
    lower.includes("not found") ||
    lower.includes("does not exist") ||
    /\b404\b/.test(raw)
  ) {
    return { category: "not-found", message: "We couldn't find what you were looking for.", retryable: false };
  }
  if (
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    /\b429\b/.test(raw)
  ) {
    return { category: "rate-limit", message: "You're going a little fast. Wait a moment and try again.", retryable: true };
  }
  if (
    raw.includes("[CONVEX") ||
    lower.includes("convexerror") ||
    name === "ConvexError"
  ) {
    return { category: "convex", message: "Couldn't save changes. Please try again.", retryable: true };
  }
  if (/\b5\d{2}\b/.test(raw) || lower.includes("internal server error")) {
    return {
      category: "server",
      message: "Something went wrong on our side. Please try again.",
      retryable: true,
    };
  }

  return {
    category: "unknown",
    message: "Something went wrong. Please try again.",
    retryable: true,
  };
}

/** Log an error to the console — dev/preview only. In production this is
 *  a no-op so we don't leak stacks into user devtools or feed log shippers
 *  with PII-shaped Convex payloads.
 *
 *  Use alongside sanitizeError() — toast/UI gets the sanitized message,
 *  console gets the raw error for debugging. */
export function logError(scope: string, err: unknown, extra?: Record<string, unknown>): void {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") return;
  // eslint-disable-next-line no-console
  console.error(`[${scope}]`, err, extra ?? "");
}

/** Convenience: sanitize + log in one call. Returns the SanitizedError so
 *  callers can pass `.message` straight into a toast. */
export function reportError(scope: string, err: unknown, extra?: Record<string, unknown>): SanitizedError {
  logError(scope, err, extra);
  return sanitizeError(err);
}
