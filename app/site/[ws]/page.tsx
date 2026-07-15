"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { FileText, Globe } from "lucide-react";
import { api } from "@convex/_generated/api";
import { DynamicIcon } from "@/shared/components/icon-picker";

interface Props {
  params: Promise<{ ws: string }>;
}

function relative(ts: number): string {
  const diff = Date.now() - ts;
  const d = Math.round(diff / 86_400_000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.round(d / 30)}mo ago`;
  return `${Math.round(d / 365)}y ago`;
}

export default function WorkspaceSitePage({ params }: Props) {
  const { ws } = use(params);
  const data = useQuery(api.sites.workspaceDirectory, { wsSlug: ws });

  if (data === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-muted-foreground">Loading site…</div>
    );
  }

  if (data === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <Globe className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
        <h1 className="text-xl font-semibold">Workspace not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">No workspace with slug “{ws}” exists.</p>
      </div>
    );
  }

  if (data.pages.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <DynamicIcon value={data.workspace.emoji} className="mx-auto mb-2 text-3xl" />
        <h1 className="text-xl font-semibold">{data.workspace.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          No public pages yet. Owner can flip a page to public from its Share menu.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6 flex items-center gap-3 border-b border-border pb-4">
        <DynamicIcon value={data.workspace.emoji} className="text-3xl" />
        <div>
          <h1 className="text-2xl font-semibold">{data.workspace.name}</h1>
          <p className="text-xs text-muted-foreground">
            Public pages · {data.pages.length} {data.pages.length === 1 ? "entry" : "entries"}
          </p>
        </div>
      </header>
      <ul className="space-y-1">
        {data.pages.map((p) => (
          <li key={String(p.id)}>
            <Link
              href={`/share/${p.shareSlug ?? p.id}`}
              className="group flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 transition hover:border-border-strong hover:bg-accent"
            >
              <span className="flex min-w-0 items-center gap-2">
                <DynamicIcon value={p.icon || "📄"} className="shrink-0 text-base" />
                <span className="truncate text-sm">{p.title || "Untitled"}</span>
              </span>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {relative(p.updatedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <footer className="mt-8 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/60">
        <FileText className="h-3 w-3" />
        Powered by Silong
      </footer>
    </div>
  );
}
