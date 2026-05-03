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
    return JSON.stringify(err);
  } catch {
    return fallback;
  }
}
