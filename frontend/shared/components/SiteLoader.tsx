"use client";

import { useEffect, useState } from "react";

/** Full-screen initiate splash — fleet-standard loading state (same UX as
 *  the template fleet's site-loader). Shown over the workspace until the
 *  caller flips `ready`; a gentle creep keeps the bar alive while waiting
 *  and a hard 8s timeout guarantees a slow/unreachable backend can never
 *  leave the visitor stuck on the loader forever. Theme tokens only —
 *  bar uses bg-primary (no bg-brand token in this app). */
export function SiteLoader({ ready }: { ready: boolean }) {
  const [done, setDone] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [creep, setCreep] = useState(12);

  // Safety net — never block the workspace for more than 8s.
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 8000);
    return () => clearTimeout(t);
  }, []);

  // Reveal as soon as data is ready.
  useEffect(() => {
    if (ready) setDone(true);
  }, [ready]);

  // Gentle creep so the bar always feels alive while waiting.
  useEffect(() => {
    if (done) return;
    const i = setInterval(() => setCreep((c) => Math.min(c + 5, 92)), 220);
    return () => clearInterval(i);
  }, [done]);

  // Unmount after the fade-out finishes.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setRemoved(true), 500);
    return () => clearTimeout(t);
  }, [done]);

  if (removed) return null;
  const pct = done ? 100 : creep;

  return (
    <div
      aria-hidden={done}
      className={`fixed inset-0 z-[100] grid place-items-center bg-background transition-opacity duration-500 ${
        done ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="w-full max-w-[220px] px-6 text-center">
        <div className="mx-auto mb-6 grid size-12 animate-pulse place-items-center rounded-xl bg-foreground text-lg font-bold text-background">
          S
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-3 text-xs tabular-nums text-muted-foreground">{pct}%</p>
      </div>
    </div>
  );
}
