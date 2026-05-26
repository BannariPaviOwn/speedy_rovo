type ServiceRoleSetupNoticeProps = {
  /** Short label for what the key unlocks (e.g. "create or remove staff logins"). */
  forFeature: string;
};

/**
 * Shown when server env lacks SUPABASE_SERVICE_ROLE_KEY — setup guidance, not a runtime failure.
 */
export function ServiceRoleSetupNotice({
  forFeature,
}: ServiceRoleSetupNoticeProps) {
  return (
    <div
      className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-4 text-sm text-sky-100/90"
      role="status"
    >
      <p className="font-semibold text-sky-50/95">
        Optional setup to {forFeature}
      </p>
      <p className="mt-2 text-sky-100/85">
        Everything else on this page still works. When you are ready, add one
        server-only variable (copied from your Supabase project — we cannot
        generate it for you).
      </p>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sky-100/85">
        <li>
          Open{" "}
          <a
            href="https://supabase.com/dashboard/project/_/settings/api"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--accent)] underline underline-offset-2"
          >
            Supabase Dashboard → Project Settings → API
          </a>
          .
        </li>
        <li>
          Under <strong>Project API keys</strong>, copy the{" "}
          <code className="rounded bg-black/30 px-1 py-0.5 text-xs">
            service_role
          </code>{" "}
          secret (not the anon/publishable key).
        </li>
        <li>
          Add to{" "}
          <code className="rounded bg-black/30 px-1 py-0.5 text-xs">
            .env.local
          </code>{" "}
          in the project root:
          <pre className="mt-2 overflow-x-auto rounded-lg bg-black/35 px-3 py-2 text-xs text-sky-50/90">
            SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret
          </pre>
        </li>
        <li>
          Restart <code className="text-xs">npm run dev</code> so Next.js loads
          the new variable.
        </li>
      </ol>
      <p className="mt-3 text-xs text-sky-100/70">
        Never put this key in client code or{" "}
        <code className="text-[10px]">NEXT_PUBLIC_*</code> variables.
      </p>
    </div>
  );
}
