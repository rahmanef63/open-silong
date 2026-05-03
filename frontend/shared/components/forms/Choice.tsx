import { cn } from "@/shared/lib/utils";

interface ChoiceProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<readonly [T, string]>;
  className?: string;
}

export function Choice<T extends string>({ value, onChange, options, className }: ChoiceProps<T>) {
  return (
    <div
      role="radiogroup"
      className={cn("flex flex-wrap gap-1 rounded-md border border-border bg-background p-1 w-fit", className)}
    >
      {options.map(([v, label]) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v)}
            className={cn(
              "px-3 py-1 text-xs rounded transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
