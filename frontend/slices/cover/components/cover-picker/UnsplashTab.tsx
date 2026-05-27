"use client";

import Image from "next/image";
import { useState } from "react";
import { useAction } from "convex/react";
import { Loader2, Search } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import type { CoverData } from "@/shared/types/domain";
import type { UnsplashPhoto } from "@convex/features/unsplash/actions";
import { CURATED_UNSPLASH } from "../../lib/unsplashCurated";

interface Props {
  onPick: (cover: CoverData) => void;
}

export function UnsplashTab({ onPick }: Props) {
  const search = useAction(api["features/unsplash/actions"].search);
  const [q, setQ] = useState("");
  // Default to curated photos so the tab is useful even without the
  // UNSPLASH_ACCESS_KEY env var set on the backend. Search replaces
  // this list with live API results when invoked.
  const [photos, setPhotos] = useState<UnsplashPhoto[]>(CURATED_UNSPLASH);
  const [isCurated, setIsCurated] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!q.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await search({ query: q, perPage: 24 });
      setPhotos(res.photos);
      setIsCurated(false);
      if (res.error) setError(res.error);
    } finally {
      setBusy(false);
    }
  }

  function pickPhoto(p: UnsplashPhoto) {
    onPick({
      type: "unsplash",
      value: p.regular,
      positionY: 50,
      metadata: {
        id: p.id,
        thumb: p.thumb,
        full: p.full,
        photographer: p.photographer,
        photographerUrl: p.photographerUrl,
        source: p.source,
        width: p.width,
        height: p.height,
      },
    });
  }

  return (
    <div className="space-y-3 p-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="Search Unsplash (mountain, ocean, ...)"
            className="pl-8 text-xs"
            disabled={busy}
          />
        </div>
        <Button onClick={run} disabled={busy || !q.trim()}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="px-3 py-2">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {photos.length === 0 && !busy && !error && (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No matches. Try another keyword.
        </p>
      )}

      {photos.length > 0 && (
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {isCurated ? "Curated photos · type to search Unsplash" : `${photos.length} result${photos.length === 1 ? "" : "s"}`}
        </p>
      )}

      {photos.length > 0 && (
        <div className="grid max-h-96 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pickPhoto(p)}
              title={`Photo by ${p.photographer}`}
              className="group relative overflow-hidden rounded-md border border-border/40 transition hover:border-foreground"
            >
              <Image
                src={p.thumb}
                alt={p.alt}
                width={400}
                height={240}
                sizes="(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="block aspect-[5/3] w-full object-cover"
              />
              <span className="absolute inset-x-0 bottom-0 truncate bg-foreground/60 px-1.5 py-0.5 text-[10px] text-background opacity-0 transition group-hover:opacity-100">
                {p.photographer}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
