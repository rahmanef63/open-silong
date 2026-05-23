export const MAX_NEST = 5;

export function NestingCap({ type }: { type: string }) {
  return (
    <div className="rounded-md border border-dashed border-warning/40 bg-warning/10 p-2 text-xs text-warning">
      Max nesting reached — {type} can&apos;t go deeper than {MAX_NEST} levels.
    </div>
  );
}
