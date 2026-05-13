import { useEffect } from "react";
import type { Preferences } from "@/shared/types/domain";

export function useThemeEffect(preferences: Preferences) {
  useEffect(() => {
    const apply = () => {
      const wantDark =
        preferences.theme === "dark" ||
        (preferences.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", wantDark);
    };
    apply();
    if (preferences.theme === "system") {
      const m = window.matchMedia("(prefers-color-scheme: dark)");
      m.addEventListener("change", apply);
      return () => m.removeEventListener("change", apply);
    }
  }, [preferences.theme]);
}
