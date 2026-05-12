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
      "mcp/dist/**",
      "si-coder/**",
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
              message: "Import from slice barrel only: @/slices/<name>.",
            },
            {
              group: ["**/src/*"],
              message: "src/ folder not used. Use @/slices, @/shared, @convex aliases.",
            },
          ],
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "prefer-const": "warn",
    },
  },
  {
    files: ["frontend/slices/*/index.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    files: ["frontend/slices/*/**/*.{ts,tsx}"],
    ignores: ["frontend/slices/*/index.ts"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@/slices/*/*"],
              message: "Cross-slice imports must go through barrel: @/slices/<name>.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["convex/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "convex/ is server-only. No React." },
            { name: "react-dom", message: "convex/ is server-only. No React." },
          ],
          patterns: [
            { group: ["next/*"], message: "convex/ is server-only. No Next imports." },
            { group: ["@/shared/ui/*"], message: "convex/ cannot import UI." },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
