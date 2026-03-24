import { Suspense } from "react";
import { LoginClient } from "./login-client";

function LoginFallback() {
  return (
    <div className="mesh-bg flex min-h-dvh items-center justify-center px-4">
      <p className="text-sm text-[var(--text-muted)]">Loading…</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}
