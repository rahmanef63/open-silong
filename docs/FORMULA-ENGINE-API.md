# Formula Engine — Public API Surface Review

**Status:** Publish-ready. Engine is genericized + zero-dependency, now locked
by two CI gates: `__boundary__.test.ts` (relative-imports-only ⇒ zero dep, no
Node built-ins, Convex/edge-runtime safe) and `__surface__.test.ts` (SemVer
export tripwire). Remaining is the external `rahman-shared` copy + publish
itself (1.G.2 step A), then post-publish Convex wiring.

This document is the **API contract** the package will publish. Anything
listed under "Public surface" is part of the SemVer commitment; anything
under "Intentional non-exports" can change without bumping major.

Source of truth: `frontend/slices/databases/lib/formulaEngine/index.ts`.
Boundary enforcement: `lib/formulaEngine/__boundary__.test.ts` fails CI if any
engine file imports anything non-relative (domain alias, npm dep, or Node
built-in) — proving the directory is zero-dependency and Convex/edge-runtime
safe. `__surface__.test.ts` freezes the public value-export surface (§6 SemVer).

---

## 1. Public surface (the SemVer contract)

### 1.1 Types

#### Value kinds

```ts
type FormulaValue =
  | { kind: "string";  value: string }
  | { kind: "number";  value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "date";    value: string }              // ISO 8601
  | { kind: "null" }
  | { kind: "list";    value: FormulaValue[] }
  | { kind: "page";    value: PageEntity }          // for `.member` drilldown

interface PageEntity {
  id: string;
  title: string;
  icon: string;
  rowOfDatabaseId?: string;
  rowProps?: Record<string, unknown>;
}
```

**Invariants:**
- `value` is always present except for `null` kind.
- `list` may contain mixed kinds (rare; only via explicit composition).
- `page` carries `id` + `title` + `icon` at minimum; `rowOfDatabaseId`
  enables drilldown via `EngineHost.findPropertyByNameOrId`.

#### AST

```ts
type ExprNode =
  | { kind: "num";    value: number;  pos: number }
  | { kind: "str";    value: string;  pos: number }
  | { kind: "bool";   value: boolean; pos: number }
  | { kind: "ref";    name: string;   pos: number }
  | { kind: "call";   fn: string; args: ExprNode[]; pos: number }
  | { kind: "binop";  op: BinOp; left: ExprNode; right: ExprNode; pos: number }
  | { kind: "unary";  op: "-" | "+" | "!"; arg: ExprNode; pos: number }
  | { kind: "member"; object: ExprNode; member: string; pos: number }
  | { kind: "lambda"; params: string[]; body: ExprNode; pos: number };

type BinOp =
  | "+" | "-" | "*" | "/" | "%"
  | ">" | "<" | ">=" | "<="
  | "==" | "!="
  | "&&" | "||";

type Node =
  | { kind: "tmpl"; parts: TemplatePart[] }    // `Hello {{Name}}!`
  | { kind: "math"; expr: ExprNode }           // `=expr`
  | { kind: "expr"; expr: ExprNode };          // bare `fn(...)`

type TemplatePart =
  | { kind: "text"; value: string }
  | { kind: "ref";  name: string; pos: number };

interface FormulaError {
  message: string;
  pos: number;
  end?: number;                                // editor squiggle range
}
```

#### Host interface (the consumer adapter)

```ts
interface EngineHost<TProp, TVal, TPage, TDb> {
  // Row reads
  getRowId(row: TPage): string;
  getRowTitle(row: TPage): string;
  getRowProp(row: TPage, propId: string): TVal | undefined;
  toPageEntity(row: TPage): PageEntity;

  // Schema reads
  getDbId(db: TDb): string;
  findPropertyByNameOrId(db: TDb, nameOrId: string): TProp | undefined;
  getPropertyId(prop: TProp): string;

  // THE boundary: typed lift
  resolvePropertyValue(
    v: TVal | undefined,
    prop: TProp,
    ctx: EvalContext<TProp, TVal, TPage, TDb>,
  ): FormulaValue;
}

interface EvalContext<TProp, TVal, TPage, TDb> {
  row: TPage;
  db: TDb;
  pages: TPage[];
  databases?: TDb[];
  envStack?: Array<Record<string, FormulaValue>>;
  visited?: Set<string>;
  cache?: Map<string, FormulaValue>;
  host: EngineHost<TProp, TVal, TPage, TDb>;
}

interface EvalResult {
  value: FormulaValue;
  error?: FormulaError;
}
```

#### Editor introspection metadata

```ts
type FnGroup = "string" | "number" | "date" | "list" | "logic" | "ref";
type FnReturns = "string" | "number" | "boolean" | "date" | "list" | "any";

interface FnSignature {
  args: string[];        // human-readable; `...name` prefix = variadic
  returns: FnReturns;
  group: FnGroup;
  desc: string;          // one-line tooltip (no trailing period)
}

type FnSignatureMap = Record<string, FnSignature>;
```

### 1.2 Functions

#### Value constructors
- `NULL_VALUE: FormulaValue` (singleton)
- `str(v: string): FormulaValue`
- `num(v: number): FormulaValue`
- `bool(v: boolean): FormulaValue`
- `date(v: string): FormulaValue`
- `list(v: FormulaValue[]): FormulaValue`
- `page(v: PageEntity): FormulaValue`

#### Coercion helpers
- `toString(v: FormulaValue): string`
- `toNumber(v: FormulaValue): number`
- `toBoolean(v: FormulaValue): boolean`
- `toDate(v: FormulaValue): Date | null`
- `isEmpty(v: FormulaValue): boolean`
- `formatFormulaValue(v: FormulaValue): string` (alias of `toString`)

#### Parser
- `parseFormula(src: string): { ast: Node | null; error?: FormulaError }`

#### Evaluator
- `evalFormulaCore<TP,TV,TPg,TDb>(src: string, ctx: EvalContext<...>): EvalResult`

#### Editor introspection
- `SIGNATURES: Record<string, FnSignature>` — all fn names, mixed-case
- `listFunctionNames(): string[]` — sorted, mixed-case
- `functionsByGroup(): Record<FnGroup, string[]>` — sorted within each group
- `getSignature(name: string): FnSignature | undefined` — case-insensitive
- `canonicalFunctionName(name: string): string` — lowercase→mixed-case lookup
- `HIGHER_ORDER_NAMES: Set<string>` — `{map, filter, reduce, find, sort, every, some}`

#### Dep walker
- `collectDeps(ast: Node): Set<string>` — every property ref name in the tree

### 1.3 Built-in function library (~50)

All in `SIGNATURES` registry. Listed for stability commitment:

| Group | Names |
|---|---|
| `string` | concat · lower · upper · contains · replace · replaceAll · substring · slice · repeat · format · indexOf |
| `number` | round · floor · ceil · abs · sign · sqrt · exp · ln · log10 · log2 · sin · cos · tan · pow · mod · min · max · pi · e |
| `date` | now · today · dateAdd · dateSubtract · dateBetween · formatDate · year · month · day · hour · minute · second · timestamp · fromTimestamp |
| `list` | count · sum · prod · mean · avg · join · length · slice · reverse · first · last · at · includes · unique · **map · filter · reduce · find · sort · every · some** |
| `logic` | if · ifs · switch · and · or · not · empty · toBoolean · toNumber · toString |
| `ref` (parser pseudo-fn) | prop |

**Polymorphic fns:** `length`, `slice`, `reverse`, `contains`, `includes`
dispatch on first-arg kind (string vs list).

**Higher-order semantics:** body re-evaluated per element with env frame
bound to `current`, `index` (and `accumulator` for reduce). Lambda forms
accepted: bare arrow (`current => expr`), paren arrow (`(current) => expr`),
multi-param paren (`(current, index) => expr`), implicit (bare body
referencing `current`).

---

## 2. Reserved identifiers (parser-level)

| Name | Resolution | Scope |
|---|---|---|
| `title`, `name` | `host.getRowTitle(ctx.row)` | always |
| `now` | `new Date().toISOString()` | always |
| `today` | `new Date().toISOString().slice(0, 10)` | always |
| `current`, `index`, `accumulator` | lambda env frame; else falls through to property lookup | always parseable, only meaningful inside higher-order body |
| `true`, `false` | bool literal (case-insensitive) | always |
| `prop` | parser-special: `prop("X")` → `ref` AST node | requires `(` followed by string literal |

Any other bare ident WITHOUT `(` is a parse error (`Expected '(' after
function name 'X'`). This is strict by design — no silent variable
resolution, no Notion-style "every bare ident is a property ref" behavior.

---

## 3. Intentional non-exports (free to change)

These are private engine internals. They are NOT in `index.ts` and
consumers cannot rely on them:

- `lib/formulaEngine/ParserClass.ts` — `Parser` class (used by `parseFormula`)
- `lib/formulaEngine/dateUtils.ts` — `addUnit`, `diffUnit`, `formatDate`
  helpers (consumed only by `date` fns)
- `lib/formulaEngine/functions/_registry.ts` — `FnHandler`, `FnRegistry`,
  `need` arity guard
- `lib/formulaEngine/functions/{string,number,date,list,logic,refs,higherOrder}.ts`
  — internal registries (merged into `SIGNATURES` + dispatcher)
- `evaluator.ts` internals: `formulaEqual`, `formulaCompare`, `evalNode`,
  `evalExpr`, `resolveRef`, `resolveMember`

Changing any of these — adding/removing fns inside `string.ts`, renaming
helpers, restructuring the parser class — does NOT require a major bump
as long as the public dispatcher (`SIGNATURES`, `evalCall`, `evalFormulaCore`)
behaviour stays the same.

---

## 4. Engine invariants (the behavioral contract)

These are guaranteed across all minor + patch versions:

1. **Pure functions only.** No `console`, no `fetch`, no global mutation,
   no `Math.random()` outside fn handlers (where `now()` / `today()`
   call `Date` deliberately).
2. **Synchronous.** No Promises returned, no async/await. Hosts that need
   async data must materialize it before calling `evalFormulaCore`.
3. **Errors never thrown to caller.** `evalFormulaCore` always returns
   `{ value, error? }`. Parser + evaluator both wrap throws.
4. **Cross-kind equality is strict.** `5 == "5"` → false. No JS coercion.
5. **Ordering rules:** date+date and string+string compare lexicographically
   (ISO 8601 sorts chronologically); other kind pairs coerce to number;
   NaN compares as 0-difference (never throws).
6. **Short-circuit `&&` / `||` return boolean.** Not the truthy operand
   value like JS. Right side not evaluated when left determines result.
7. **Lambda env frames shadow properties.** Inside `map(...)`, `current`
   always means the iteration element even if a property named "Current"
   exists.
8. **Cycle guard owns one set per eval tree.** Host's recursive
   `resolvePropertyValue` calls thread `visited` + `cache` through child
   ctx. No mutable state outside ctx.
9. **`page` kind toString returns title.** Back-compat for
   `concat(prop("Owner"))` printing names.
10. **Polymorphic fns dispatch on first arg.** `length(string)` and
    `length(list)` both work; `length(number)` coerces via toString.

---

## 5. Namespace concerns + import patterns

The barrel is **flat** — all symbols at top level. Common-name collision
risk (`list`, `str`, `num`, `page`, `bool`, `date`). For consumers in
projects that use React or other libraries with overlapping names:

```ts
// Recommended for projects with name conflicts
import * as Engine from "rahman-shared/formulaEngine";
const v = Engine.list([Engine.num(1), Engine.str("a")]);

// Recommended for tight scopes (e.g. test files)
import { evalFormulaCore, num, str, list } from "rahman-shared/formulaEngine";

// Acceptable but verbose
import { num as numV, str as strV } from "rahman-shared/formulaEngine";
```

**Decision:** ship flat barrel. Consumers self-namespace if needed —
matches the engine's lean style and avoids forcing `Engine.` prefix on
the 95% of users who don't have collisions.

---

## 6. SemVer impact rules

Once published (1.G.2 step A), apply these to `rahman-shared` bumps:

### MAJOR (breaking)
- Removing or renaming any symbol in §1
- Changing `EngineHost` method signatures (arg list, return type, throw
  semantics)
- Changing `EvalContext` shape (new required fields)
- Changing `FormulaValue` discriminant kinds (adding is minor; removing/
  renaming is major)
- Changing fn handler return-kind for any name in §1.3 (e.g. if `length`
  ever returned `string` instead of `number`)
- Changing operator precedence
- Tightening parser strictness for previously-accepted formulas

### MINOR (additive)
- Adding a new fn to any group in §1.3
- Adding a new `FnGroup` value (e.g. "ai" later)
- Adding a new `FormulaValue` kind (must extend toString/toNumber/etc
  to never throw)
- Adding a new ExprNode kind that consumer ASTs won't encounter unless
  they re-parse
- Adding an OPTIONAL field to `EvalContext`
- Adding an OPTIONAL field to `EngineHost` (with engine fallback)
- Adding a new reserved bare ident (only if previously-unused ident name)

### PATCH (bugfix)
- Fixing an off-by-one in a fn handler
- Tightening type narrowing internal to a handler (doesn't change return)
- Performance improvements with identical observable behavior
- Documentation / typo fixes in `SIGNATURES.desc`

---

## 7. Initial publish strategy

**Target package:** `rahman-shared` (already at 0.2.0 in npm)

**Bump:** minor → **0.3.0**. Adding `rahman-shared/formulaEngine` is
purely additive; existing `cn`, `formatDate`, `useDebounce` exports
unchanged.

**Package entry:** add `rahman-shared/formulaEngine` subpath export to
`rahman-shared/package.json`:
```json
{
  "exports": {
    ".": "./src/index.ts",
    "./hooks/*": "./src/hooks/*.ts",
    "./lib/*": "./src/lib/*.ts",
    "./formulaEngine": "./src/formulaEngine/index.ts"
  }
}
```

**Files moved (copy, not delete during transition):**
- `frontend/slices/databases/lib/formulaEngine/*` →
  `packages/shared/src/formulaEngine/*` in the `rahman-shared` repo

**Local consumer swap:**
- `lib/formulaEngine.ts` barrel changes its imports from
  `./formulaEngine/index` → `rahman-shared/formulaEngine`
- The local `lib/formulaEngine/` directory becomes a deleted artifact
  (kept on a branch for one release in case of rollback)
- `silongHost` in `lib/formula.ts` stays in this repo (consumer side)

**Boundary gate stays:** test moves from `lib/formulaEngine/__boundary__.test.ts`
to the rahman-shared repo's CI; locally we add a thin proxy test that
asserts no consumer-side leak BACK into the engine path.

---

## 8. Open items before publish

1. **License header** — rahman-shared is MIT; engine ships with the same.
   No additional headers needed in per-file source.
2. **Tree-shaking** — ✅ AUDITED. `functions/index.ts` builds `REGISTRY` +
   `SIGNATURES` as top-level `const` object-spreads of imported const maps;
   `_registry.ts` is types + a pure `need()` guard; every domain module
   (`string`/`number`/`date`/`list`/`logic`) exports pure const maps. Zero
   module-level side effects ⇒ `"sideEffects": false` is safe to declare.
   Per-fn tree-shaking is N/A by design: `evalCall` dispatches through one
   merged `REGISTRY` that references all groups, so any `evalFormulaCore`
   consumer legitimately needs all handlers — granularity is "import the
   engine or not", which is correct (not a regression).
3. **TS-only target** — `rahman-shared/package.json` ships `.ts` directly
   (no `dist/`). Engine code is now CI-proven zero-dep + Node-builtin-free
   (gate above) ⇒ runtime-safe for `.ts`-direct execution in Convex/edge.
   The only residual is whether Convex deploy RESOLVES a `.ts` subpath
   export — a packaging detail, validated empirically at first publish
   (move convexHost → `convex/features/formulas/host.ts`, import
   `rahman-shared/formulaEngine`, run `convex deploy`). No code blocker.
4. **Test parity** — the 611 vitest cases live in this repo. On lift,
   parity tests should also move to `rahman-shared`. Defer until publish.
