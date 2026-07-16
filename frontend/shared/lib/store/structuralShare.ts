export interface CacheEntry<Out> {
  sig: string;
  obj: Out;
}

/** Pure reconcile step for structural sharing over a Convex reactive array.
 *  Maps each raw row, and REUSES the previously-mapped object when its
 *  serialized content is byte-identical — so unchanged rows keep their object
 *  identity across pushes and downstream React.memo can short-circuit.
 *
 *  Content-keyed (not updatedAt-keyed) on purpose: several mutations change a
 *  mapped field without bumping updatedAt (restore→trashed, rowProps mirrors,
 *  rowIds/views/wiki), so a timestamp key would serve a stale object. Returns
 *  the mapped array + the next cache, which holds only current ids (deleted
 *  ids are pruned by construction). */
export function reconcileStructural<Raw, Out extends { id: string }>(
  raw: Raw[],
  map: (r: Raw) => Out,
  prev: Map<string, CacheEntry<Out>>,
): { out: Out[]; next: Map<string, CacheEntry<Out>> } {
  const next = new Map<string, CacheEntry<Out>>();
  const out = raw.map((r) => {
    const obj = map(r);
    const sig = JSON.stringify(obj);
    const cached = prev.get(obj.id);
    const chosen = cached && cached.sig === sig ? cached.obj : obj;
    next.set(obj.id, { sig, obj: chosen });
    return chosen;
  });
  return { out, next };
}
