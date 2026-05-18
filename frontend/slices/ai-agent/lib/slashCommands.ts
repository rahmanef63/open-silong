export interface SlashCommand {
  id: string;
  trigger: string;
  label: string;
  hint: string;
  buildPrompt: (input: string, context?: string) => { system?: string; userPrompt: string };
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "improve",
    trigger: "/improve",
    label: "Improve writing",
    hint: "Polish grammar, flow, and clarity of selected/last text",
    buildPrompt: (input, context) => ({
      system: "Rewrite the user's text with improved grammar, flow, and clarity. Preserve tone and meaning. Reply with only the rewritten text — no preamble.",
      userPrompt: context ? `${context}\n\n---\nInstruction: ${input || "improve this"}` : input,
    }),
  },
  {
    id: "summarize",
    trigger: "/summarize",
    label: "Summarize",
    hint: "TL;DR of the current page or pasted text",
    buildPrompt: (input, context) => ({
      system: "Summarize the input into 3–5 concise bullet points. Markdown bullets. No preamble.",
      userPrompt: context || input,
    }),
  },
  {
    id: "translate",
    trigger: "/translate",
    label: "Translate",
    hint: "Translate to another language. Usage: /translate id|en|ja|...",
    buildPrompt: (input, context) => {
      const parts = input.trim().split(/\s+/);
      const lang = parts[0] || "id";
      const rest = parts.slice(1).join(" ");
      const text = context || rest;
      return {
        system: `Translate the input to ${lang}. Reply with only the translation — no preamble.`,
        userPrompt: text,
      };
    },
  },
  {
    id: "generate-template",
    trigger: "/generate-template",
    label: "Generate page template",
    hint: "Describe a page → get TemplateJson you can paste into the admin Templates editor",
    buildPrompt: (input) => ({
      system: `You generate Nosion page templates as JSON. Schema:
{
  "version": 1, "name": str, "icon": emoji, "category": str, "description"?: str,
  "page": {
    "ref": "root", "title": str, "icon": emoji,
    "blocks": [{ "type": one_of["paragraph","h1","h2","h3","todo","bullet","numbered","quote","code","callout","divider","image","equation","embed","button","page","database","columns2","columns3","toggle","table"], "text"?: str, "databaseRef"?: str }],
    "databases"?: [{ "ref": str, "name": str, "icon": emoji,
      "properties": [{ "id": str, "name": str, "type": one_of["text","number","select","multi_select","status","date","person","checkbox","url","email","phone","files","relation","rollup","formula","created_time","created_by","last_edited_time","last_edited_by","unique_id"], "options"?: [{"id":str,"name":str,"color":str}], "numberFormat"?: "currency"|"percent"|"plain" }],
      "views"?: [{ "id": str, "type": "table"|"board"|"list"|"gallery"|"calendar"|"timeline", "name": str, "isDefault"?: bool, "groupBy"?: prop_id }],
      "seedRows"?: [{ "props": { propId: value, ... } }]
    }]
  }
}
Reply with ONLY a fenced \`\`\`json block — no preamble, no explanation.`,
      userPrompt: `Generate a Nosion page template for: ${input}`,
    }),
  },
  {
    id: "ask",
    trigger: "/ask",
    label: "Ask",
    hint: "Free-form question; uses page context if available",
    buildPrompt: (input, context) => ({
      userPrompt: context ? `${context}\n\n---\nQuestion: ${input}` : input,
    }),
  },
  // ─── Skill directives (force-route to a specific tool) ─────
  {
    id: "skill-append",
    trigger: "/append",
    label: "Append to this page",
    hint: "Force a pages_append_markdown call on the active page",
    buildPrompt: (input) => ({
      userPrompt: `Use the pages_append_markdown tool to add the following to the active page (use activePageId from USER_CONTEXT):\n\n${input}`,
    }),
  },
  {
    id: "skill-create",
    trigger: "/create",
    label: "Create new page",
    hint: "Force a pages_create call with the given title",
    buildPrompt: (input) => ({
      userPrompt: `Use the pages_create tool to create a new page titled: ${input}`,
    }),
  },
  {
    id: "skill-rename",
    trigger: "/rename",
    label: "Rename this page",
    hint: "Force a pages_set_title call on the active page",
    buildPrompt: (input) => ({
      userPrompt: `Use the pages_set_title tool to rename the active page (use activePageId) to: ${input}`,
    }),
  },
  {
    id: "skill-icon",
    trigger: "/icon",
    label: "Set page icon",
    hint: "Force a pages_set_icon call (emoji)",
    buildPrompt: (input) => ({
      userPrompt: `Use the pages_set_icon tool to set the active page icon (use activePageId) to: ${input}`,
    }),
  },
];

export function findSlash(text: string): { cmd: SlashCommand; rest: string } | null {
  const trimmed = text.trim();
  for (const cmd of SLASH_COMMANDS) {
    if (trimmed === cmd.trigger || trimmed.startsWith(cmd.trigger + " ")) {
      return { cmd, rest: trimmed.slice(cmd.trigger.length).trim() };
    }
  }
  return null;
}
