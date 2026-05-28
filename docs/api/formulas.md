# Formula language reference

open-silong's formula engine is a portable, Notion-style expression
evaluator. It powers `formula` database columns and (via the same engine)
filtering/sorting on computed columns.

- **Implementation:** `frontend/slices/databases/lib/formulaEngine/`
  (pure, host-adapted — see [§ Engine internals](#engine-internals)).
- **Editor:** the `fx` formula editor (cell popover + column config) with
  autocomplete, signature hints, a return-type pill, and inline error
  squiggles.
- **Tests:** 200+ unit + property-based cases
  (`formulaEngine*.test.ts`).

---

## Syntax modes

A formula is written in one of three forms, auto-detected:

| Form | Example | Result |
|---|---|---|
| **Template** | `Hi {{Name}}!` | interpolated **string** (always) |
| **Math/expr** (`=` prefix) | `=round({{Price}} * 1.1, 0)` | typed value |
| **Bare call** | `concat({{First}}, {{Last}})` | typed value |

Property references use either `{{Name}}` (template-style, works
everywhere) or **`prop("Name")`** (Notion-canonical, math/expr only).
Both resolve identically — by property **name OR id**, case-insensitive.

---

## Operators

Lowest → highest precedence:

| Group | Operators | Returns |
|---|---|---|
| Logical OR | `\|\|` | boolean (short-circuit) |
| Logical AND | `&&` | boolean (short-circuit) |
| Equality | `==` `!=` | boolean (**strict same-kind** — `5 == "5"` is `false`) |
| Comparison | `<` `<=` `>` `>=` | boolean (date+string lexicographic, else numeric) |
| Additive | `+` `-` | number |
| Multiplicative | `*` `/` `%` | number |
| Unary | `-` `+` `!` | number / boolean |

`&&` and `||` short-circuit and **return a boolean** (not the truthy
operand like JS). Division/modulo by zero yields `NaN` (renders empty).

---

## Reserved identifiers

| Name | Resolves to |
|---|---|
| `title`, `name` | the row's title |
| `now` | current timestamp |
| `today` | today's date (no time) |
| `true` / `false` | boolean literal (case-insensitive) |
| `current`, `index`, `accumulator` | lambda variables (inside higher-order fns only) |
| `prop("X")` | property `X` (alias of `{{X}}`) |

Any other bare identifier without `(` is a parse error — there is **no**
implicit variable resolution (strict, Notion-aligned).

---

## Function catalog (~50)

### String
`concat(...values)` · `lower(text)` · `upper(text)` · `contains(haystack, needle)` ·
`replace(text, find, with)` · `replaceAll(text, find, with)` ·
`substring(text, start, length?)` · `slice(value, start, end?)` ·
`repeat(text, n)` · `format(value)` · `indexOf(haystack, needle)`

### Number
`round` · `floor` · `ceil` · `abs` · `sign` · `sqrt` · `exp` · `ln` ·
`log10` · `log2` · `sin` · `cos` · `tan` · `pow(base, exp)` ·
`mod(a, b)` · `min(...values)` · `max(...values)` · `pi()` · `e()`
(`min`/`max` accept either varargs or a single list.)

### Date
`now()` · `today()` · `dateAdd(d, n, unit)` · `dateSubtract(d, n, unit)` ·
`dateBetween(a, b, unit)` · `formatDate(d, pattern)` · `year` · `month` ·
`day` · `hour` · `minute` · `second` · `timestamp(d)` · `fromTimestamp(ms)`

### List
`count` · `sum` · `prod` · `mean` · `avg` · `join(list, sep?)` ·
`length(value)` · `slice` · `reverse` · `first` · `last` · `at(list, i)` ·
`includes(list, value)` · `unique(list)`
(`length`/`slice`/`reverse` are polymorphic over string | list.)

### Higher-order (lambda)
`map(list, body)` · `filter(list, body)` · `reduce(list, body, initial)` ·
`find(list, body)` · `sort(list, body)` · `every(list, body)` · `some(list, body)`

Lambda body forms (both accepted):

```
map(prop("Tags"), upper(current))               # implicit `current`
map(prop("Tags"), (current) => upper(current))   # explicit arrow
filter(prop("Tasks"), current.Status == "Done")  # current is a page entity
reduce(prop("Prices"), accumulator + current, 0) # accumulator + current
sort(prop("Tasks"), current.DueDate)             # sort key
```

Lambdas bind reserved names only (`current`, `index`, `accumulator`) —
`(a, b) => a + b` won't resolve `a`/`b`. `every([])` is `true`,
`some([])` is `false` (vacuous).

### Logic
`if(cond, then, else?)` · `ifs(c1, v1, ..., default?)` ·
`switch(value, case1, r1, ..., default?)` · `and(...)` · `or(...)` ·
`not(value)` · `empty(value)` · `toBoolean` · `toNumber` · `toString`

---

## Relation drilldown

A `relation` property resolves to a **list of page entities**. Use
`.member` access to pull fields from the related rows:

```
prop("Owner").title          # ["Alice"]  (list — relations are list-shaped)
prop("Owner").email          # cross-db lookup of the Email property
first(prop("Owner")).title   # "Alice"     (unwrap single-element list)
map(prop("Assignees"), current.email)
```

Built-in members: `.title` / `.name`, `.icon`, `.id`. Any other member is
looked up as a property on the related row's database.

---

## Rollup in formulas

`rollup` columns are computed (not stored) but resolve to **typed** values
inside formulas, so they compose with everything:

```
prop("Total") * 1.1                              # sum aggregate → number
sum(filter(prop("Prices"), current >= 20))       # values aggregate → list
prop("EarliestDue") < today()                    # earliest aggregate → date
```

`values` aggregate yields a list; `percent_checked` is `0..100`.

---

## Editor features

- **`fx ▾` picker** — all functions grouped (string/number/date/list/
  logic/ref) with signatures + search.
- **Autocomplete** — function names + `{{prop}}` names; inside a
  higher-order body, `current`/`index`/`accumulator` rank first.
- **Signature hints** — the active argument is bold while you type a call.
- **Return-type pill** — `→ number` / `→ boolean` / etc., inferred
  statically.
- **Error squiggle** — the failing span is underlined in place.

---

## Engine internals

The engine is **pure** (zero domain imports — enforced by a boundary test)
and generic over a host interface, so it can run against any row/schema
shape:

```ts
EngineHost<TProp, TVal, TPage, TDb>   // the consumer adapter
evalFormulaCore(src, ctx)             // generic entry point
```

- open-silong's adapter: `lib/formula.ts::silongHost`.
- A second Convex-`Doc`-shape adapter (`lib/convexHost.ts`) is parity-
  tested against it.
- The engine is being extracted to the `rahman-shared` npm package
  (`rahman-shared/formulaEngine`); see `docs/FORMULA-ENGINE-API.md` for
  the public-API + SemVer contract.

To add a function: drop a handler + signature in the matching
`functions/<group>.ts`; the picker, autocomplete, and sig-hints pick it
up automatically from the `SIGNATURES` registry.
