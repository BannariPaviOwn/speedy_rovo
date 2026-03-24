"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/client";
import {
  mapAuthSignInErrorForUsernameUi,
  usernameToAuthEmail,
} from "@/lib/username-auth";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      const username = String(fd.get("username") ?? "");
      const password = String(fd.get("password") ?? "");
      let email: string;
      try {
        email = usernameToAuthEmail(username);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid username.");
        return;
      }

      // Clear any existing session so the next sign-in fully replaces cookies
      // (avoids appearing “stuck” as the previous user when the session was
      // not refreshed correctly).
      await supabase.auth.signOut({ scope: "local" });

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInErr) {
        setError(mapAuthSignInErrorForUsernameUi(signInErr.message));
        return;
      }

      router.push("/slots");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mesh-bg relative flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-[var(--mesh-1)] blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[var(--mesh-2)] blur-3xl" />
      </div>

      <div className="glass-panel relative z-10 w-full max-w-md rounded-2xl border border-[var(--border-subtle)] p-8 shadow-2xl">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)] shadow-lg shadow-[var(--accent)]/20">
            <LayoutGrid className="h-7 w-7" strokeWidth={2} />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold text-[var(--text-primary)]">
              Staff sign in
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Username and password only. Nothing is sent to your browser as an
              email — sign-in runs in this browser so your session updates
              correctly when you switch accounts.
            </p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="username"
              className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              inputMode="text"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="your_username"
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]/40 focus:ring-1 focus:ring-[var(--accent)]/30"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]/40 focus:ring-1 focus:ring-[var(--accent)]/30"
            />
          </div>

          {error ? (
            <p
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100/90"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-[var(--accent)] py-6 text-base font-bold text-[var(--accent-foreground)] hover:brightness-105 disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          <Link
            href="/slots"
            className="font-medium text-[var(--accent)] hover:underline"
          >
            Back to schedule
          </Link>
        </p>
      </div>
    </div>
  );
}
