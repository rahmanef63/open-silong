"use client";

import type { TemplatePage } from "./template-preview/types";
import { PageRender } from "./template-preview/PageRender";

/** Render a template's root page (plus child pages) like an actual page
 *  would look — used by the admin preview dialog so reviewers don't have
 *  to imagine the output from JSON or a structure tree. */
export function TemplatePagePreview({ json }: { json: unknown }) {
  const j = json as { page?: TemplatePage };
  if (!j?.page) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground italic">
        Template has no root page.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <PageRender page={j.page} depth={0} />
    </div>
  );
}
