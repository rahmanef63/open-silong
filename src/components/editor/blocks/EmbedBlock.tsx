import { useState } from "react";
import type { Block } from "@/lib/types";

interface Props {
  block: Block;
  onUpdate: (patch: Partial<Block>) => void;
}

interface EmbedInfo { src: string; provider: string }

function toEmbedUrl(raw: string): EmbedInfo | null {
  try {
    const url = raw.trim();
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    // YouTube
    if (host.endsWith("youtube.com") && u.searchParams.get("v")) {
      return { src: `https://www.youtube.com/embed/${u.searchParams.get("v")}`, provider: "YouTube" };
    }
    if (host === "youtu.be") {
      return { src: `https://www.youtube.com/embed${u.pathname}`, provider: "YouTube" };
    }
    // Vimeo
    if (host.endsWith("vimeo.com") && /^\/\d+/.test(u.pathname)) {
      return { src: `https://player.vimeo.com/video${u.pathname}`, provider: "Vimeo" };
    }
    // Loom
    if (host.endsWith("loom.com") && u.pathname.startsWith("/share/")) {
      return { src: url.replace("/share/", "/embed/"), provider: "Loom" };
    }
    // Figma
    if (host.endsWith("figma.com") && /^\/(file|proto|design|board)\//.test(u.pathname)) {
      return { src: `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`, provider: "Figma" };
    }
    // CodeSandbox
    if (host.endsWith("codesandbox.io") && u.pathname.startsWith("/s/")) {
      return { src: `https://codesandbox.io/embed${u.pathname}`, provider: "CodeSandbox" };
    }
    // CodePen
    if (host.endsWith("codepen.io") && /\/pen\//.test(u.pathname)) {
      return { src: url.replace("/pen/", "/embed/"), provider: "CodePen" };
    }
    // Spotify
    if (host.endsWith("spotify.com") && (u.pathname.startsWith("/track/") || u.pathname.startsWith("/playlist/") || u.pathname.startsWith("/album/") || u.pathname.startsWith("/episode/"))) {
      return { src: `https://open.spotify.com/embed${u.pathname}`, provider: "Spotify" };
    }
    // Generic fallback (may be blocked by X-Frame-Options)
    return { src: url, provider: host };
  } catch {
    return null;
  }
}

export function EmbedBlock({ block, onUpdate }: Props) {
  const [draft, setDraft] = useState(block.url ?? "");
  const embed = block.url ? toEmbedUrl(block.url) : null;

  if (!block.url) {
    return (
      <div className="rounded-md border border-dashed border-border p-4 text-center my-1">
        <div className="text-sm text-muted-foreground mb-2">Paste a URL to embed</div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (draft.trim()) onUpdate({ url: draft.trim() }); }}
          className="flex gap-2 max-w-md mx-auto"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="YouTube · Vimeo · Loom · Figma · CodePen · Spotify · …"
            className="flex-1 rounded-md border border-border bg-transparent px-3 py-1.5 text-sm outline-none focus:ring-2 ring-brand/30"
          />
          <button type="submit" className="rounded-md bg-foreground text-background px-3 py-1.5 text-sm">Embed</button>
        </form>
      </div>
    );
  }

  if (!embed) {
    return (
      <div className="rounded-md border border-dashed border-destructive/50 p-3 text-xs text-destructive my-1">
        Could not embed this URL.
        <button onClick={() => onUpdate({ url: undefined })} className="ml-2 underline">Reset</button>
      </div>
    );
  }

  return (
    <div className="group/embed relative my-1">
      <div className="aspect-video w-full overflow-hidden rounded-md border border-border bg-muted">
        <iframe
          src={embed.src}
          className="h-full w-full"
          title={`Embed: ${embed.provider}`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{embed.provider}</span>
        <button
          onClick={() => onUpdate({ url: undefined })}
          className="opacity-0 group-hover/embed:opacity-100 hover:text-foreground transition"
        >
          Replace
        </button>
      </div>
    </div>
  );
}
