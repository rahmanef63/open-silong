/** Inbound email → page.
 *
 *  POST handler for SMTP webhook providers (Postmark, Mailgun, etc).
 *  Expected JSON body shape (Postmark-compatible subset):
 *    { From: "user@host", Subject: "...", TextBody: "..." }
 *  Or our generic shape:
 *    { from: "user@host", subject: "...", text: "..." }
 *
 *  AUTH: shared secret in `X-Email-Token` header matched against
 *  `EMAIL_INBOUND_TOKEN` env. Sender allowed-list from
 *  `EMAIL_ALLOWED_SENDERS` (comma-separated). Target user from
 *  `EMAIL_TARGET_USER_ID` (a `users` _id).
 *
 *  CONFIG: deploy-time env vars only — no UI yet. Future work:
 *  per-user `emailIngestRules` table to map sender → owner + parent.
 */

import { httpAction } from "../_generated/server";
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

interface Body {
  from?: string;
  From?: string;
  subject?: string;
  Subject?: string;
  text?: string;
  TextBody?: string;
}

function normalize(body: Body) {
  return {
    from: (body.from ?? body.From ?? "").toLowerCase().trim(),
    subject: (body.subject ?? body.Subject ?? "").trim().slice(0, 200),
    text: (body.text ?? body.TextBody ?? "").trim(),
  };
}

function paragraphsToBlocks(text: string): Array<{ type: string; text: string }> {
  // Split on blank lines; cap to 500 paragraphs to bound write size.
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 500)
    .map((p) => ({ type: "paragraph", text: p }));
}

export const inboundEmail = httpAction(async (ctx, req) => {
  const token = req.headers.get("x-email-token");
  const expected = process.env.EMAIL_INBOUND_TOKEN;
  if (!expected) return new Response("inbound disabled", { status: 503 });
  if (!token || token !== expected) return new Response("unauthorized", { status: 401 });

  const allowedRaw = process.env.EMAIL_ALLOWED_SENDERS ?? "";
  const allowlist = allowedRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

  const targetUserId = process.env.EMAIL_TARGET_USER_ID;
  if (!targetUserId) return new Response("EMAIL_TARGET_USER_ID unset", { status: 503 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const norm = normalize(body);
  if (!norm.from) return new Response("from required", { status: 400 });
  if (allowlist.length > 0 && !allowlist.includes(norm.from)) {
    return new Response("sender not allowed", { status: 403 });
  }
  if (!norm.subject && !norm.text) return new Response("empty email", { status: 400 });

  const pageId = await ctx.runMutation(internal.email.inbound.createPageFromEmail, {
    userId: targetUserId as Id<"users">,
    title: norm.subject || "(no subject)",
    blocks: paragraphsToBlocks(norm.text),
    from: norm.from,
  });

  return new Response(JSON.stringify({ ok: true, pageId }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

/** Internal — called by `inboundEmail` httpAction. Stamps a small marker
 *  block at the top so the user knows the source. */
export const createPageFromEmail = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    blocks: v.array(v.object({ type: v.string(), text: v.string() })),
    from: v.string(),
  },
  handler: async (ctx, { userId, title, blocks, from }) => {
    const now = Date.now();
    const marker = {
      type: "callout",
      text: `📧 Imported from email: ${from}`,
    };
    const allBlocks = [marker, ...blocks];
    const pageId = await ctx.db.insert("pages", {
      userId,
      parentId: null,
      title,
      icon: "📧",
      cover: null,
      blocks: allBlocks.map((b, i) => ({ id: `${now}_${i}`, ...b })),
      favorite: false,
      trashed: false,
      createdAt: now,
      updatedAt: now,
    });
    return pageId;
  },
});
