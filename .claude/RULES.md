# Rules — non-negotiable

> Source of truth for Claude / agents working in this repo.
> If a rule conflicts with what I'm about to do, I stop and ask.

## Architecture

1. **Slice architecture.** All feature code lives under `src/slices/<kebab-name>/`.
   Backend mirror under `convex/features/<camelName>/`. See `.claude/ARCHITECTURE.md`.

2. **Shared code goes under `src/shared/`.** Cross-feature primitives: `shared/ui/`,
   `shared/lib/`, `shared/hooks/`, `shared/types/`. Never `import` from a sibling
   slice — go through `shared/` or the slice's barrel.

3. **One slice = one feature.** A feature is a thing the user can name (Inbox,
   Comments, Files). UI primitives (Button, Dialog) are not features — they live in `shared/ui/`.

## File hygiene

4. **200-line soft cap per file.** At ~150 lines start planning a split.
   At 200+ lines split before adding more. Splits should be by responsibility,
   not arbitrary chunks.

5. **One concept per file.** A component file exports one component (+ its tightly
   coupled subcomponents). A hook file exports one hook.

6. **Barrels (`index.ts`) re-export the public surface only.** Internal helpers
   stay un-exported.

## Code style

7. **Dynamic over hardcoded.** No magic literals embedded in JSX. Hardcoded
   counts, copy strings, IDs, URLs → must be derived from data, config, or
   constants in a `lib/` file.

8. **Reuse `shared/ui/`.** Don't reinvent buttons, popovers, dropdowns, dialogs.
   shadcn primitives in `shared/ui/` are the design system.

9. **No `any` unless wrapping untyped third-party code.** Convex docs return
   `any` from `useQuery` until typed via `api` paths — those are fine.

10. **Comments only when WHY is non-obvious.** Never WHAT. Never paste a TODO
    referencing a ticket — file an issue instead.

## Refactoring

11. **`git mv`, never re-create.** Preserve history. If a file moves, run
    `git mv old new` and only edit imports — don't rewrite the file.

12. **`sed -i` for bulk import path updates.** Faster than per-file edits, and
    more auditable in the diff.

13. **Build after every move.** `npx tsc --noEmit && npm run build`. Don't pile
    up moves before checking.

## Convex

14. **Each slice owns its Convex module.** `convex/features/<name>/queries.ts`
    and `mutations.ts`. Re-export from `convex/features/<name>/index.ts`.

15. **Schema is one file** (`convex/schema.ts`) due to Convex constraints.
    But per-feature additions are grouped & commented:
    ```ts
    // === inbox ===
    notifications: defineTable({ ... }),
    ```

16. **Workspace/user isolation always.** Every query/mutation starts with
    `getAuthUserId(ctx)`; every query uses the `by_user` index.

## Process

17. **Never invent UI patterns.** Before writing new menu/dialog UX, search
    `src/slices/` and `src/shared/ui/` for an existing pattern.

18. **Build → commit → push per feature.** Don't batch unrelated changes.
    Each feature ships in its own commit with a self-contained message.

19. **`.claude/` docs are normative.** If a rule needs updating, update it
    in `.claude/RULES.md` first, then change the code.

20. **Surface deviations.** If you must violate a rule (e.g. legacy code),
    leave a `// LEGACY:` comment explaining and tracked in `.claude/DEBT.md`.
