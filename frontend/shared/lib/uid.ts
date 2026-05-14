/** Short non-cryptographic id for client-side block / row / option keys.
 *  ~8 base36 chars from `Math.random()` — collision probability negligible
 *  at the per-document scale we operate at. Use a real UUID generator if a
 *  surface ever needs cross-system uniqueness. */
export const uid = () => Math.random().toString(36).slice(2, 10);
