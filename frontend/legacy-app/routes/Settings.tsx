import { AppShell } from "@/legacy-app/AppShell";
import { useStore } from "@/shared/lib/store";
import { LandingView, PageSort, SidebarDensity, ThemePref, EditorBehavior } from "@/shared/types/domain";
import { Settings as SettingsIcon } from "lucide-react";
import { ThemePicker } from "@/slices/theme-presets";

const ICONS = ["🪐","🚀","🌱","🛰️","🎨","🧠","🪄","🌙","☕","🔥","🌊","✨"];

const SettingsPage = () => {
  const { workspace, updateWorkspace, preferences, updatePreferences } = useStore();
  return (
    <AppShell>
      <div className="h-full overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-2xl px-6 md:px-12 py-12 space-y-8">
          <header className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"><SettingsIcon className="h-5 w-5" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight font-serif">Settings</h1>
              <p className="text-sm text-muted-foreground">Workspace and editor preferences.</p>
            </div>
          </header>

          <Section title="Workspace">
            <Field label="Workspace name">
              <input value={workspace.name} onChange={e => updateWorkspace({ name: e.target.value })} className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </Field>
            <Field label="Workspace icon">
              <div className="flex flex-wrap gap-1">
                {ICONS.map(i => (
                  <button key={i} onClick={() => updateWorkspace({ emoji: i })} className={"text-xl rounded p-2 hover:bg-accent " + (workspace.emoji === i ? "bg-accent ring-1 ring-ring" : "")}>{i}</button>
                ))}
              </div>
            </Field>
          </Section>

          <Section title="Appearance">
            <Field label="Theme">
              <Choice value={preferences.theme} onChange={(v) => updatePreferences({ theme: v as ThemePref })}
                options={[["light","Light"],["dark","Dark"],["system","System"]]} />
            </Field>
            <Field label="Color preset">
              <ThemePicker />
            </Field>
            <Field label="Sidebar density">
              <Choice value={preferences.sidebarDensity} onChange={(v) => updatePreferences({ sidebarDensity: v as SidebarDensity })}
                options={[["comfortable","Comfortable"],["compact","Compact"]]} />
            </Field>
          </Section>

          <Section title="Pages">
            <Field label="Default page sort">
              <Choice value={preferences.defaultPageSort} onChange={(v) => updatePreferences({ defaultPageSort: v as PageSort })}
                options={[["manual","Manual"],["title","Title"],["updated","Last updated"],["created","Created"]]} />
            </Field>
            <Field label="Default landing view">
              <Choice value={preferences.landingView} onChange={(v) => updatePreferences({ landingView: v as LandingView })}
                options={[["dashboard","Dashboard"],["recent","Recent pages"],["favorites","Favorites"],["last","Last opened page"]]} />
            </Field>
          </Section>

          <Section title="Editor">
            <Field label="Editor behavior">
              <Choice value={preferences.editorBehavior} onChange={(v) => updatePreferences({ editorBehavior: v as EditorBehavior })}
                options={[["default","Default"],["minimal","Minimal (hide hover controls)"]]} />
            </Field>
          </Section>
        </div>
      </div>
    </AppShell>
  );
};

function Section({ title, children }: any) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
function Field({ label, children }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
function Choice({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string,string][] }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-md border border-border bg-background p-1 w-fit">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)}
          className={"px-3 py-1 text-xs rounded " + (value === v ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent")}>
          {label}
        </button>
      ))}
    </div>
  );
}

export default SettingsPage;
