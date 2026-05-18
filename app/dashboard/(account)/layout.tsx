import type { ReactNode } from "react";

/** Account-area shell. Width was max-w-2xl (672px) — too narrow once the
 *  settings page grew a 3-column grid (sidebar 224 + content + aside 320).
 *  Widened to max-w-7xl (1280px) so settings breathes; narrow pages
 *  (profile) wrap their own content in `mx-auto max-w-2xl`. */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-7xl px-6 md:px-12 py-12 space-y-8">{children}</div>
    </div>
  );
}
