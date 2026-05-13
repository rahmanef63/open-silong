export const MAX_NEST = 5;

export function NestingCap({ type }: { type: string }) {
  return (
    <div className="rounded-md border border-dashed border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
      Max nesting reached — {type} can&apos;t go deeper than {MAX_NEST} levels.
    </div>
  );
}
