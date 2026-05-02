import { AppShell } from "@/legacy-app/AppShell";
import { Dashboard } from "@/slices/dashboard/views/Dashboard";

const Index = () => (
  <AppShell>
    <Dashboard />
  </AppShell>
);

export default Index;
