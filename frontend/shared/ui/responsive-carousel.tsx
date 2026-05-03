"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

/**
 * App Store-style horizontal carousel.
 * - Scroll-snap on desktop + mobile.
 * - Mobile: swipe-scrollable, hidden scrollbar.
 * - Desktop: arrow buttons appear in header row.
 */

export interface ResponsiveCarouselProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  cellClassName?: string;
  cellWidth?: string;
  hideControls?: boolean;
}

export function ResponsiveCarousel({
  title,
  description,
  headerAction,
  children,
  className,
  cellClassName,
  cellWidth = "w-64",
  hideControls,
}: ResponsiveCarouselProps) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = React.useState(true);
  const [atEnd, setAtEnd] = React.useState(false);

  const updateEdges = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateEdges();
    el.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, [updateEdges]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.max(el.clientWidth * 0.8, 240);
    el.scrollBy({ left: step * dir, behavior: "smooth" });
  };

  const items = React.Children.toArray(children);

  return (
    <section className={cn("space-y-3", className)}>
      {(title || description || headerAction || !hideControls) && (
        <header className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="text-base font-semibold text-foreground lg:text-lg">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-muted-foreground lg:text-sm">
                {description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerAction}
            {!hideControls && (
              <div className="hidden lg:flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Sebelumnya"
                  onClick={() => scrollBy(-1)}
                  disabled={atStart}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Berikutnya"
                  onClick={() => scrollBy(1)}
                  disabled={atEnd}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </header>
      )}

      <div
        ref={scrollerRef}
        role="list"
        className={cn(
          "flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2",
          "[scrollbar-width:none] [-ms-overflow-style:none]",
          "[&::-webkit-scrollbar]:hidden",
          "scroll-px-4 -mx-4 px-4 lg:mx-0 lg:px-0 lg:scroll-px-0",
        )}
      >
        {items.map((child, i) => (
          <div
            key={i}
            role="listitem"
            className={cn("shrink-0 snap-start", cellWidth, cellClassName)}
          >
            {child}
          </div>
        ))}
      </div>
    </section>
  );
}
