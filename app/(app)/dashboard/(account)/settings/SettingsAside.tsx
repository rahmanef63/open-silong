"use client";

/** Right-column context panel for the settings page.
 *  Per-section: quick help, related links, discovery URLs, status.
 *  Hidden on mobile/tablet; appears at lg+ where the 3rd column fits. */

import type { ComponentType } from "react";
import Link from "next/link";
import {
  ExternalLink, HelpCircle, KeyRound, Plug, FileText, Save, User,
  Palette, Webhook, LifeBuoy, ShieldCheck, Sparkles, Bot,
} from "lucide-react";
import type { SettingsKey } from "./SettingsSidebar";

type Tip = { icon: ComponentType<{ className?: string }>; label: string; href?: string; external?: boolean };

type AsideContent = {
  title: string;
  blurb: string;
  tips?: Tip[];
  links?: { label: string; href: string; external?: boolean }[];
};

const SITE_DOCS = "https://silong.rahmanef.com";

const ASIDE: Record<SettingsKey, AsideContent> = {
  workspace: {
    title: "Tentang workspace",
    blurb: "Workspace = boundary kolaborasi. Tiap user dapat 1 personal workspace + bisa join workspace lain via invite.",
    tips: [
      { icon: User, label: "Slug workspace muncul di share URL" },
      { icon: ShieldCheck, label: "Owner role pegang transfer + delete" },
    ],
  },
  appearance: {
    title: "Tema + density",
    blurb: "Tema dipakai untuk seluruh dashboard. Density mempengaruhi tinggi baris sidebar + list view.",
    tips: [
      { icon: Palette, label: "System mode follow OS preference" },
    ],
  },
  ai: {
    title: "Bring your own AI keys",
    blurb: "Kalau admin key kehabisan quota atau kamu mau pakai model premium, daftar key kamu di sini. Personal key cuma untuk kamu; workspace key di-share ke member.",
    tips: [
      { icon: KeyRound, label: "Plaintext key di-encrypt sebelum disimpan (AES-GCM-256)" },
      { icon: Bot, label: "Resolver order: personal preferOwn → workspace shared → admin fallback" },
      { icon: ShieldCheck, label: "Workspace key butuh role owner / editor" },
    ],
    links: [
      { label: "OpenRouter API keys", href: "https://openrouter.ai/keys", external: true },
      { label: "Anthropic console", href: "https://console.anthropic.com/settings/keys", external: true },
      { label: "OpenAI platform", href: "https://platform.openai.com/api-keys", external: true },
    ],
  },
  pages: {
    title: "Editor + sort defaults",
    blurb: "Defaults baru muncul di page yang kamu buat setelahnya. Existing page tidak diubah.",
    tips: [
      { icon: FileText, label: "Sort default cuma untuk side-nav, bukan database view" },
    ],
  },
  backup: {
    title: "Export + import",
    blurb: "JSON export berisi semua page + database + view kamu (snapshot + share-slug + wiki ikut). Import remap id otomatis.",
    tips: [
      { icon: Save, label: "Import diulang aman — slug collision di-drop, sisanya passthrough" },
      { icon: ShieldCheck, label: "Max 8 MB JSON / 50 MB ZIP / 3 import per menit" },
    ],
  },
  "mcp-apps": {
    title: "MCP — Model Context Protocol",
    blurb: "Standard buat agentic AI client (ChatGPT / Claude / Cursor / dll) ngomong sama workspace kamu. OAuth 2.1 + PKCE atau static bearer.",
    tips: [
      { icon: ShieldCheck, label: "Token scoped per-user — client cuma akses page kamu" },
      { icon: Sparkles, label: "Tools: pages_list, pages_search, pages_get, pages_create, pages_append_markdown" },
    ],
    links: [
      { label: "/.well-known/oauth-authorization-server", href: "/.well-known/oauth-authorization-server", external: true },
      { label: "/.well-known/oauth-protected-resource", href: "/.well-known/oauth-protected-resource", external: true },
      { label: "MCP spec (modelcontextprotocol.io)", href: "https://modelcontextprotocol.io/specification/2025-11-25", external: true },
    ],
  },
  mcp: {
    title: "Script tokens (nsn_)",
    blurb: "Bearer token plain-text yang dipakai dari script / Claude Desktop / Cursor. Plain shown SEKALI di mint — store aman.",
    tips: [
      { icon: KeyRound, label: "Max 10 token aktif per user" },
      { icon: ShieldCheck, label: "Hash SHA-256 disimpan; revoke any time" },
    ],
    links: [
      { label: "MCP server URL", href: process.env.NEXT_PUBLIC_MCP_URL ?? "https://site-silong.rahmanef.com/mcp", external: true },
    ],
  },
  webhooks: {
    title: "Outbound webhooks",
    blurb: "POST event ke URL kamu (HMAC-SHA256 signature). Cocok buat sync data ke external system.",
    tips: [
      { icon: Webhook, label: "Events: page.created / page.updated / page.deleted" },
      { icon: ShieldCheck, label: "Delivery log retain 30 hari" },
    ],
  },
  tickets: {
    title: "Bug + feature requests",
    blurb: "Tiket masuk ke admin queue. Reply admin muncul inline di sini.",
    tips: [
      { icon: LifeBuoy, label: "Priority low/med/high — admin override on review" },
    ],
  },
};

export function SettingsAside({ k }: { k: SettingsKey }) {
  const content = ASIDE[k];
  if (!content) return null;
  return (
    <aside className="space-y-4 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto xl:scrollbar-thin xl:pr-1">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-start gap-2">
          <HelpCircle className="size-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">{content.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{content.blurb}</p>
          </div>
        </div>
        {content.tips && content.tips.length > 0 && (
          <ul className="space-y-2 pt-2 border-t border-border">
            {content.tips.map((t, i) => {
              const Icon = t.icon;
              return (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Icon className="size-3.5 mt-0.5 shrink-0 text-foreground/60" />
                  <span>{t.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {content.links && content.links.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Links</h3>
          <ul className="space-y-1.5">
            {content.links.map((l) => (
              <li key={l.href}>
                {l.external ? (
                  <a href={l.href} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-foreground/80 hover:text-foreground underline underline-offset-4">
                    <ExternalLink className="size-3" /> {l.label}
                  </a>
                ) : (
                  <Link href={l.href} className="inline-flex items-center gap-1 text-xs text-foreground/80 hover:text-foreground underline underline-offset-4">
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground/70 pl-1">
        Need more help? <Link href="/dashboard/settings?s=tickets" className="underline underline-offset-4">Open a ticket</Link>.
      </p>
    </aside>
  );
}
