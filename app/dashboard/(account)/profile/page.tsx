"use client";

import { useId } from "react";
import { User } from "lucide-react";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import { USER_AVATARS } from "@/shared/constants/icons";
import { Field } from "@/shared/components/forms/Field";
import { useDebouncedCommit } from "@/shared/hooks/useDebouncedCommit";
import { Button } from "@/shared/ui/button";

const INPUT_CLASS =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

export default function ProfilePage() {
  const { user, updateUser } = useStore();
  const nameId = useId();
  const emailId = useId();
  const bioId = useId();

  const [name, setName, flushName] = useDebouncedCommit(user.name, (v) => updateUser({ name: v }));
  const [email, setEmail, flushEmail] = useDebouncedCommit(user.email, (v) => updateUser({ email: v.trim() }));
  const [bio, setBio, flushBio] = useDebouncedCommit(user.bio, (v) => updateUser({ bio: v }));

  return (
    <>
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <User className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-serif">Profile</h1>
          <p className="text-sm text-muted-foreground">Your name, avatar and account details.</p>
        </div>
      </header>

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/15 text-3xl">
            {user.icon}
          </div>
          <div>
            <div className="font-semibold">{user.name}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </div>
        </div>

        <Field label="Avatar">
          <div className="flex flex-wrap gap-1">
            {USER_AVATARS.map((a) => (
              <Button
                key={a}
                type="button"
                variant="ghost"
                aria-pressed={user.icon === a}
                onClick={() => updateUser({ icon: a })}
                className={cn(
                  "h-auto text-2xl rounded p-2 font-normal",
                  user.icon === a && "bg-accent ring-1 ring-ring",
                )}
              >
                {a}
              </Button>
            ))}
          </div>
        </Field>

        <Field label="Display name" htmlFor={nameId}>
          <input
            id={nameId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={flushName}
            maxLength={80}
            className={INPUT_CLASS}
          />
        </Field>

        <Field label="Email" htmlFor={emailId}>
          <input
            id={emailId}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={flushEmail}
            maxLength={254}
            className={INPUT_CLASS}
          />
        </Field>

        <Field label="Bio" htmlFor={bioId}>
          <textarea
            id={bioId}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            onBlur={flushBio}
            rows={3}
            maxLength={500}
            className={cn(INPUT_CLASS, "resize-none")}
          />
        </Field>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Account
        </h2>
        <p className="text-sm text-muted-foreground">
          Authentication is provided by Convex Auth. Sign out from the user menu in the sidebar.
        </p>
      </section>
    </>
  );
}
