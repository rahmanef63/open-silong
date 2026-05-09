import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { PublicFormClient } from "./PublicFormClient";
import type { Property } from "@/shared/types/domain";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const loadForm = cache(async (slug: string) =>
  fetchQuery(api.forms.public.getFormBySlug, { slug })
);

interface ResolvedForm {
  title: string;
  description: string;
  successMessage: string;
  requiredPropIds: string[];
  properties: Property[];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const form = await loadForm(slug);
  if (!form) return { title: "Form not found" };
  return {
    title: form.title,
    description: form.description || `Submit a response to ${form.title}`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicFormPage({ params }: PageProps) {
  const { slug } = await params;
  const form = await loadForm(slug);
  if (!form) notFound();
  // Cast: Convex returns the property shape as `unknown`-ish since we
  // forward extra fields as opaque; widen back to `Property[]` for
  // the client component which trusts the schema.
  const safeForm: ResolvedForm = {
    title: form.title,
    description: form.description,
    successMessage: form.successMessage,
    requiredPropIds: form.requiredPropIds,
    properties: form.properties as unknown as Property[],
  };
  return (
    <main className="min-h-svh bg-background py-10 px-4">
      <PublicFormClient slug={slug} form={safeForm} />
    </main>
  );
}
