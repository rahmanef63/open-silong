import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { Block } from "@/shared/types/domain";
import { SharedPageView } from "./SharedPageView";

interface PageProps {
  params: Promise<{ id: string }>;
}

// React.cache dedupes the same id within a single request — generateMetadata
// + the page handler hit Convex once instead of twice.
const loadShare = cache(async (id: string) => {
  const page = await fetchQuery(api.pages.getPublicShare, { id });
  // Boundary cast: blocks arrive as unknown[] from the pageBlocks split read.
  return page ? { ...page, blocks: page.blocks as Block[] } : null;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const page = await loadShare(id);
  if (!page) return { title: "Page not found" };
  const title = page.title || "Untitled";
  return {
    title,
    description: `${page.icon ?? "📄"} ${title} — shared on Silong`,
    openGraph: {
      title,
      description: `Shared on Silong`,
      type: "article",
    },
    twitter: { card: "summary_large_image", title },
    robots: page.shareIndexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

export default async function SharePage({ params }: PageProps) {
  const { id } = await params;
  const page = await loadShare(id);
  if (!page) notFound();
  return <SharedPageView page={page} />;
}
