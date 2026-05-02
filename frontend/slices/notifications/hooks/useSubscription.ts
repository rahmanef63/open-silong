import { useCallback, useEffect, useState } from "react";
import type { PageSubscription, SubscriptionScope } from "../types";

const KEY = "notion-clone:subscriptions:v1";

function readAll(): Record<string, PageSubscription> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeAll(map: Record<string, PageSubscription>): void {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* ignore */ }
}

export function useSubscription(pageId: string | undefined) {
  const [sub, setSub] = useState<PageSubscription | null>(null);

  useEffect(() => {
    if (!pageId) { setSub(null); return; }
    setSub(readAll()[pageId] ?? null);
  }, [pageId]);

  const subscribe = useCallback((scopes: SubscriptionScope[]) => {
    if (!pageId) return;
    const all = readAll();
    all[pageId] = { pageId, scopes, createdAt: all[pageId]?.createdAt ?? Date.now() };
    writeAll(all);
    setSub(all[pageId]);
  }, [pageId]);

  const unsubscribe = useCallback(() => {
    if (!pageId) return;
    const all = readAll();
    delete all[pageId];
    writeAll(all);
    setSub(null);
  }, [pageId]);

  const toggleScope = useCallback((scope: SubscriptionScope) => {
    if (!pageId) return;
    const current = sub?.scopes ?? [];
    const next = current.includes(scope) ? current.filter(s => s !== scope) : [...current, scope];
    if (next.length === 0) unsubscribe();
    else subscribe(next);
  }, [pageId, sub, subscribe, unsubscribe]);

  return {
    isSubscribed: !!sub,
    scopes: sub?.scopes ?? [],
    subscribe,
    unsubscribe,
    toggleScope,
  };
}
