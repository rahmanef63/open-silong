/** ai-keys — BYOK settings surface.
 *
 *  Lets users supply their own AI provider keys (personal scope) or
 *  share a key with workspace members (workspace scope). Backend lives
 *  in `convex/aiKeys/*` + `convex/_shared/aiKeyResolver.ts`. */

export { AISection } from "./components/AISection";
export { AddKeyDialog } from "./components/AddKeyDialog";
export { ProviderKeyCard } from "./components/ProviderKeyCard";
export { useAiKeys, type UserKeyRow, type Provider, type KeyModel } from "./hooks/useAiKeys";
