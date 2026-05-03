import type { ReactNode } from "react";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-2xl px-6 md:px-12 py-12 space-y-8">{children}</div>
    </div>
  );
}
