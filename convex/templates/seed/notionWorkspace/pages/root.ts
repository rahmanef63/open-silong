/** Root page — landing dashboard that exercises EVERY Nosion block type
 *  at least once. Sub-pages get linked via `page` block refs. */

import type { TplPageT } from "../../../lib/validate";

export const rootPage: TplPageT = {
  ref: "root",
  title: "Notion Workspace",
  icon: "🪐",
  cover: null,
  blocks: [
    { type: "h1", text: "🪐 Notion Workspace" },
    {
      type: "callout",
      text: "Everything you need in one workspace — projects, tasks, notes, calendar, contacts, reading, and places. Edit any block to make it yours.",
    },
    { type: "toc" },

    { type: "h2", text: "✨ Overview" },
    {
      type: "columns3",
      columns: [
        [
          { type: "h3", text: "What this is" },
          { type: "paragraph", text: "A starter template that wires 7 databases, every view type, and every block type into a single workspace. Use it as a portable layout for any new project." },
          { type: "quote", text: "Make it your own — every property, view, and block is editable." },
        ],
        [
          { type: "h3", text: "How it links" },
          { type: "bullet", text: "Tasks belong to Projects" },
          { type: "bullet", text: "Projects have a Contact as lead" },
          { type: "bullet", text: "Events invite Contacts" },
          { type: "bullet", text: "Notes stand alone (linkable via @mention)" },
        ],
        [
          { type: "h3", text: "Setup checklist" },
          { type: "todo", text: "Add your team to Contacts", checked: false },
          { type: "todo", text: "Create your first Project", checked: false },
          { type: "todo", text: "Schedule a kickoff in Calendar", checked: false },
          { type: "todo", text: "Capture a meeting Note", checked: false },
        ],
      ],
    },

    { type: "divider" },

    { type: "h2", text: "🚀 Projects" },
    { type: "database", databaseRef: "projects" },

    { type: "h2", text: "✅ Tasks" },
    { type: "database", databaseRef: "tasks" },

    { type: "h2", text: "📝 Notes" },
    { type: "database", databaseRef: "notes" },

    { type: "h2", text: "📅 Calendar" },
    { type: "database", databaseRef: "events" },

    { type: "h2", text: "👥 Contacts" },
    { type: "database", databaseRef: "contacts" },

    { type: "h2", text: "📚 Reading" },
    { type: "database", databaseRef: "reading" },

    { type: "h2", text: "📍 Places" },
    { type: "database", databaseRef: "locations" },

    { type: "divider" },

    { type: "h2", text: "🧰 Resources" },
    {
      type: "toggle",
      text: "Tutorials",
      children: [
        { type: "numbered", text: "Add a property — column-header menu → Add property" },
        { type: "numbered", text: "Switch views — view-bar pills" },
        { type: "numbered", text: "Embed a database in another page — /database in slash menu" },
        { type: "numbered", text: "Create relations — set property type to Relation + pick target db" },
      ],
    },
    {
      type: "toggle",
      text: "Code + math + tables",
      children: [
        { type: "paragraph", text: "Three code-adjacent block types ship out of the box:" },
        { type: "code", text: "// Open ai chat from any block\n// Press Cmd/Ctrl + J to continue writing\nconst greet = (name: string) => `Hello, ${name}`", lang: "typescript" },
        { type: "paragraph", text: "Block equations render KaTeX:" },
        { type: "equation", text: "E = mc^2 \\implies m = \\frac{E}{c^2}" },
        { type: "paragraph", text: "And a simple table:" },
        { type: "table", text: "" },
      ],
    },

    { type: "h2", text: "🎬 Media demo" },
    {
      type: "columns2",
      columns: [
        [
          { type: "h4", text: "Image" },
          { type: "image", text: "" },
        ],
        [
          { type: "h4", text: "Video" },
          { type: "video", text: "" },
        ],
      ],
    },
    { type: "h4", text: "Audio" },
    { type: "audio", text: "" },

    { type: "h2", text: "🌐 Embeds + actions" },
    { type: "embed", text: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    { type: "button", text: "Open documentation" },

    { type: "h2", text: "🔁 Synced block" },
    { type: "synced", text: "Edit this once, references update everywhere." },

    { type: "h2", text: "🧭 Sub-pages" },
    {
      type: "columns4",
      columns: [
        [{ type: "page", pageRef: "page-projects" }],
        [{ type: "page", pageRef: "page-tasks" }],
        [{ type: "page", pageRef: "page-notes" }],
        [{ type: "page", pageRef: "page-calendar" }],
      ],
    },
    {
      type: "columns5",
      columns: [
        [{ type: "page", pageRef: "page-contacts" }],
        [{ type: "page", pageRef: "page-reading" }],
        [{ type: "page", pageRef: "page-places" }],
        [{ type: "callout", text: "Add your own page →" }],
        [{ type: "callout", text: "Drop more databases →" }],
      ],
    },

    { type: "divider" },
    { type: "h4", text: "About" },
    { type: "paragraph", text: "This workspace is generated from a single TemplateJson. See docs/extending.md for the schema reference." },
  ],
};
