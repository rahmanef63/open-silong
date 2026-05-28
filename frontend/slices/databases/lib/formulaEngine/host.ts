import type { FormulaValue, PageEntity } from "./types";

/** Pure-engine host interface. The engine accesses ANY domain-shaped
 *  data (properties, databases, page metadata, formula recursion, rollup
 *  computation) exclusively through these callbacks. Consumers implement
 *  one of these — Silong does so in `lib/formula.ts::silongHost`; a
 *  Convex-side adapter for 1.G.3 will be a second implementation; tests
 *  for the engine itself can stub a minimal one.
 *
 *  The four type parameters are bundled in every method's signature so
 *  the host's call sites stay strongly typed end-to-end:
 *    - TProp — the consumer's property shape (Silong's `Property`)
 *    - TVal  — the consumer's per-row value shape (`PropertyValue`)
 *    - TPage — the consumer's row shape (`Page`)
 *    - TDb   — the consumer's database shape (`Database`)
 *
 *  Engine code MUST NOT touch any of these directly; only the host knows
 *  their inner structure. */
export interface EngineHost<TProp, TVal, TPage, TDb> {
  // ── Row reads ────────────────────────────────────────────────────
  getRowId(row: TPage): string;
  getRowTitle(row: TPage): string;
  /** Stored value for a property by id — undefined when unset. Used by
   *  resolveRef + resolveMember to feed `resolvePropertyValue`. */
  getRowProp(row: TPage, propId: string): TVal | undefined;
  /** Project a row into the engine-local PageEntity so it can flow as a
   *  FormulaValue (member access target). */
  toPageEntity(row: TPage): PageEntity;

  // ── Schema reads ─────────────────────────────────────────────────
  getDbId(db: TDb): string;
  /** Look up a property by id OR (case-insensitive) name. Returns the
   *  consumer's property object — engine treats it opaque. */
  findPropertyByNameOrId(db: TDb, nameOrId: string): TProp | undefined;
  getPropertyId(prop: TProp): string;

  // ── The boundary: typed lift of a stored value ────────────────────
  /** THE central adapter. Lifts a (possibly undefined) stored value
   *  through the property's type lens into a FormulaValue. Consumer
   *  owns this — knows about select options, multi_select unwrap,
   *  date wrappers, relation → PageEntity list, etc.
   *
   *  Receives the FULL eval context (not just the value) because some
   *  property types (notably `formula` + `rollup`) need to recurse back
   *  into the engine. Host pulls the engine's evalFormulaCore from the
   *  ctx-threaded callbacks if needed. */
  resolvePropertyValue(
    v: TVal | undefined,
    prop: TProp,
    ctx: EvalContext<TProp, TVal, TPage, TDb>,
  ): FormulaValue;
}

/** Generic eval context — threaded through every engine call. `host` is
 *  required; everything else is engine-managed state. */
export interface EvalContext<TProp, TVal, TPage, TDb> {
  row: TPage;
  db: TDb;
  pages: TPage[];
  /** Optional — cross-database schema lookup pool. Member-access drilldown
   *  walks `databases` to find the target db when a relation crosses
   *  database boundaries. */
  databases?: TDb[];

  /** Lambda env frames pushed by higher-order fns (map/filter/reduce/etc).
   *  Innermost wins; resolveRef checks here BEFORE property lookup. */
  envStack?: Array<Record<string, FormulaValue>>;

  /** Cycle guard for formula→formula recursion. Owned by the engine but
   *  carried across host re-entries so the host's recursion handler can
   *  use the same set. */
  visited?: Set<string>;
  /** Memoization for repeated formula refs in one eval tree. */
  cache?: Map<string, FormulaValue>;

  host: EngineHost<TProp, TVal, TPage, TDb>;
}
