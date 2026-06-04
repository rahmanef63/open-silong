import type { ReactNode } from "react";
import DashboardShell from "./DashboardShell";
import { DemoRibbon } from "@/shared/components/DemoRibbon";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DashboardShell>{children}</DashboardShell>
      <DemoRibbon />
    </>
  );
}
