"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Local mirror of an external value that flushes upstream after `delayMs` of
 * keystroke silence. Returns `[localValue, setLocalValue, flush]`.
 *
 * Why: avoids writing to global stores (zustand persist → localStorage) on
 * every keystroke. Source-of-truth still wins on external updates.
 */
export function useDebouncedCommit<T>(
  external: T,
  commit: (next: T) => void,
  delayMs = 300,
): [T, (next: T) => void, () => void] {
  const [local, setLocal] = useState<T>(external);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const externalRef = useRef(external);
  const localRef = useRef(local);
  localRef.current = local;

  useEffect(() => {
    externalRef.current = external;
    setLocal(external);
  }, [external]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function update(next: T) {
    setLocal(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (next !== externalRef.current) commit(next);
    }, delayMs);
  }

  function flush() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (localRef.current !== externalRef.current) commit(localRef.current);
  }

  return [local, update, flush];
}
