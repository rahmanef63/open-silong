import { AppShell } from "@/legacy-app/AppShell";
import { useStore } from "@/shared/lib/store";
import { User } from "lucide-react";

const AVATARS = ["🦊","🐼","🐧","🦉","🦄","🐯","🐻","🐙","🦁","🐸","🐵","🐶"];

const ProfilePage = () => {
  const { user, updateUser } = useStore();
  return (
    <AppShell>
      <div className="h-full overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-2xl px-6 md:px-12 py-12 space-y-8">
          <header className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"><User className="h-5 w-5" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight font-serif">Profile</h1>
              <p className="text-sm text-muted-foreground">Your name, avatar and account details.</p>
            </div>
          </header>

          <section className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/15 text-3xl">{user.icon}</div>
              <div>
                <div className="font-semibold">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Avatar</label>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {AVATARS.map(a => (
                  <button key={a} onClick={() => updateUser({ icon: a })}
                    className={"text-2xl rounded p-2 hover:bg-accent " + (user.icon === a ? "bg-accent ring-1 ring-ring" : "")}>{a}</button>
                ))}
              </div>
            </div>
            <Field label="Display name">
              <input value={user.name} onChange={e => updateUser({ name: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </Field>
            <Field label="Email">
              <input value={user.email} onChange={e => updateUser({ email: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </Field>
            <Field label="Bio">
              <textarea value={user.bio} onChange={e => updateUser({ bio: e.target.value })} rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
            </Field>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Account</h2>
            <p className="text-sm text-muted-foreground">Authentication is mocked. Connect Lovable Cloud to enable real accounts.</p>
          </section>
        </div>
      </div>
    </AppShell>
  );
};

function Field({ label, children }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export default ProfilePage;
