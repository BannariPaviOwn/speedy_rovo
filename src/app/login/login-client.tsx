"use client";

import { useSearchParams } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useEffect, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { signInAction } from "@/app/auth/actions";
import { LOGIN_SESSION_EXPIRED_PARAM } from "@/lib/auth/constants";
import { hasSupabaseEnv } from "@/lib/auth/supabase-env";

export function LoginClient() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(() =>
    hasSupabaseEnv()
      ? null
      : "Missing Supabase settings. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
  );
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === LOGIN_SESSION_EXPIRED_PARAM) {
      setError(
        "Your session expired or was signed in elsewhere. Please sign in again.",
      );
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!hasSupabaseEnv()) {
      return;
    }

    setPending(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await signInAction(
        formData,
        searchParams.get("next"),
      );
      if (result?.error) {
        setError(result.error);
        setPending(false);
      }
    } catch (err) {
      if (isRedirectError(err)) {
        throw err;
      }
      setError(
        err instanceof Error
          ? err.message
          : "Could not reach sign-in. Check your network, Supabase URL, and API key in .env.local.",
      );
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
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <button
            type="submit"
            disabled={pending || !hasSupabaseEnv()}
            className="w-full rounded-xl bg-[var(--accent)] py-6 text-base font-bold text-[var(--accent-foreground)] hover:brightness-105 disabled:opacity-60 disabled:pointer-events-none"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
