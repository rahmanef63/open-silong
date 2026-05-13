export type Mark = "bold" | "italic" | "strike" | "code" | "link";

export type AIPreset = "improve" | "shorter" | "longer" | "grammar" | "translate";

export const AI_PROMPTS: Record<AIPreset, { label: string; system: string; build: (sel: string) => string }> = {
  improve: {
    label: "Improve writing",
    system: "Rewrite the user's text to read more clearly and concisely while preserving meaning. Output only the rewritten text — no commentary, no quotes, no markdown wrappers.",
    build: (s) => s,
  },
  shorter: {
    label: "Make shorter",
    system: "Shorten the user's text while preserving its meaning. Output only the shortened text — no commentary.",
    build: (s) => s,
  },
  longer: {
    label: "Make longer",
    system: "Expand the user's text with relevant detail while preserving its meaning. Output only the expanded text — no commentary.",
    build: (s) => s,
  },
  grammar: {
    label: "Fix grammar & spelling",
    system: "Correct grammar and spelling in the user's text. Preserve voice, meaning, and formatting. Output only the corrected text — no commentary.",
    build: (s) => s,
  },
  translate: {
    label: "Translate to English",
    system: "Translate the user's text to English. If it is already English, translate to Indonesian instead. Output only the translation — no commentary.",
    build: (s) => s,
  },
};

export const WRAP: Record<Exclude<Mark, "link">, [string, string]> = {
  bold: ["**", "**"],
  italic: ["_", "_"],
  strike: ["~~", "~~"],
  code: ["`", "`"],
};
