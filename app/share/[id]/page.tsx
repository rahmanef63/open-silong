import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { SharedPageView } from "./SharedPageView";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function loadShare(id: string) {
  return fetchQuery(api.pages.getPublicShare, { id });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const page = await loadShare(id);
  if (!page) return { title: "Page not found" };
  const title = page.title || "Untitled";
  return {
    title,
    description: `${page.icon ?? "📄"} ${title} — shared on Nosion`,
    openGraph: {
      title,
      description: `Shared on Nosion`,
      type: "article",
    },
    twitter: { card: "summary_large_image", title },
    robots: { index: true, follow: true },
  };
}

export default async function SharePage({ params }: PageProps) {
  const { id } = await params;
  const page = await loadShare(id);
  if (!page) notFound();
  return <SharedPageView page={page} />;
}
