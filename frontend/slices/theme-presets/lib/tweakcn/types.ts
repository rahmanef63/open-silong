export interface TweakcnPresetItem {
  name: string;
  title: string;
  type?: string;
  description?: string;
  cssVars?: {
    theme?: Record<string, string>;
    light?: Record<string, string>;
    dark?: Record<string, string>;
  };
}

export interface TweakcnRegistry {
  name: string;
  items: TweakcnPresetItem[];
}

export interface TweakcnPresetMeta {
  name: string;
  title: string;
}

export interface TweakcnPresetGroup<
  T extends TweakcnPresetMeta = TweakcnPresetMeta,
> {
  id: string;
  label: string;
  items: T[];
}

export const STORAGE_KEY = "nosion:theme-preset";
export const STYLE_ID = "tweakcn-vars";
export const REGISTRY_URL = "/r/registry.json";

/** First-time visitors land on this preset. Pick something opinionated
 *  so "empty session" doesn't show the bare nosion default and look
 *  like the switcher isn't doing anything. "claude" = warm minimal,
 *  matches the brand vibe and works for both light + dark. */
export const DEFAULT_PRESET = "claude";
