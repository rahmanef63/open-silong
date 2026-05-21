import nextPlugin from "@next/eslint-plugin-next";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "next-env.d.ts",
      "node_modules/**",
      "convex/_generated/**",
      "**/*.d.ts",
    ],
  },
  ...tseslint.configs.recommended,
  {
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",
    },
  },
  {
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@/slices/*/*"],
              message: "Slice barrel imports only: @/slices/<name>. Cross-slice imports forbidden — hoist to shared/ if reused.",
            },
          ],
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "prefer-const": "warn",
    },
  },
  // Notion mega-slice adapter discipline. Discourage NEW direct Convex
  // imports inside editor / databases / notion slices. The existing 36
  // editor sites + databases store coupling get migrated in Phases 2-3
  // of the lift plan; this `warn` catches new sites being added during
  // the transition. Flipped to `error` in Phase 4 once all existing
  // sites are migrated. Adapter implementations under
  // `adapter/convexAdapter/` are exempt — that's where the direct
  // Convex calls SHOULD live (skip-listed at rr-lift time).
  {
    files: [
      "frontend/slices/editor/**/*.{ts,tsx}",
      "frontend/slices/databases/**/*.{ts,tsx}",
      "frontend/slices/notion/**/*.{ts,tsx}",
    ],
    ignores: [
      "frontend/slices/notion/adapter/convexAdapter/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@convex/_generated*", "convex/react"],
              message:
                "Direct Convex imports inside editor / databases / notion are migrating to NotionAdapter. Use `useNotionAdapter()` from `@/slices/notion` instead. See docs/api/notion-adapter.md + lift plan docs/rr-sync/2026-05-21-notion-mega-lift-plan.md.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
