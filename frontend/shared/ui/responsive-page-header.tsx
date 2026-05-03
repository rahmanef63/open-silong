import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

/**
 * Responsive page header — three visual variants sharing one props API.
 *
 * - `compact`  (default) → inline title + description + actions row.
 * - `greeting` → wraps header in a subtle brand-gradient banner with
 *                oversized title + soft decorative glows.
 * - `split`    → greeting variant + companion slot on the right.
 *
 * NOTE: CareerPack source rendered a `ParangPattern` SVG decoration in
 * the greeting variant — not ported here (Nosion has no such asset).
 * The greeting still has the gradient + glow orbs; drop in a custom
 * decorative element later if desired.
 */
export type PageHeaderVariant = "compact" | "greeting" | "split";

export interface ResponsivePageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  variant?: PageHeaderVariant;
  companion?: ReactNode;
  className?: string;
  titleClassName?: string;
}

export function ResponsivePageHeader({
  title,
  description,
  backHref,
  backLabel = "Kembali",
  actions,
  breadcrumb,
  variant = "compact",
  companion,
  className,
  titleClassName,
}: ResponsivePageHeaderProps) {
  if (variant === "compact") {
    return (
      <header className={cn("mb-4 space-y-3 lg:mb-6", className)}>
        {breadcrumb && <div className="text-xs">{breadcrumb}</div>}
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
        )}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="min-w-0">
            <h1
              className={cn(
                "text-xl font-semibold tracking-tight text-foreground lg:text-2xl",
                titleClassName,
              )}
            >
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
              {actions}
            </div>
          )}
        </div>
      </header>
    );
  }

  // greeting + split share the same banner chrome.
  const Greeting = (
    <header
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border",
        "bg-gradient-to-br from-primary/15 via-background to-primary/5",
        "px-5 py-6 md:px-8 md:py-8",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative space-y-2">
        {breadcrumb && <div className="text-xs">{breadcrumb}</div>}
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
        )}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
          <div className="min-w-0">
            <h1
              className={cn(
                "text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl leading-[1.05]",
                titleClassName,
              )}
            >
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );

  if (variant === "greeting") {
    return <div className={cn("mb-4 lg:mb-6", className)}>{Greeting}</div>;
  }

  // split — greeting + companion card.
  return (
    <div
      className={cn(
        "mb-4 grid gap-4 lg:mb-6 md:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]",
        className,
      )}
    >
      {Greeting}
      {companion && (
        <aside
          aria-label="Informasi tambahan"
          className="rounded-2xl border border-border bg-card p-4 md:p-5"
        >
          {companion}
        </aside>
      )}
    </div>
  );
}
