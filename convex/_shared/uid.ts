/** Short non-cryptographic id for block / row / option keys generated
 *  server-side (e.g. import paths, page initialisation). 8 base36 chars
 *  from `Math.random()` — collision probability negligible at the
 *  per-document scale we operate at. */
export const uid = () => Math.random().toString(36).slice(2, 10);
