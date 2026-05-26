import { hasSupabaseServiceRole } from "@/lib/supabase-admin";

/** Thrown by staff mutations that need Auth Admin API or service-role writes. */
export const SUPABASE_SERVICE_ROLE_REQUIRED =
  "SUPABASE_SERVICE_ROLE_REQUIRED" as const;

export function serviceRoleSetupUserMessage(): string {
  return (
    "Add SUPABASE_SERVICE_ROLE_KEY to .env.local (server-only, never in the browser). " +
    "In Supabase Dashboard → Project Settings → API, copy the service_role secret. " +
    "Restart the dev server after saving .env.local."
  );
}

export function assertSupabaseServiceRole(): void {
  if (!hasSupabaseServiceRole()) {
    throw new Error(SUPABASE_SERVICE_ROLE_REQUIRED);
  }
}

export function isServiceRoleSetupError(message: string): boolean {
  return message === SUPABASE_SERVICE_ROLE_REQUIRED;
}

/** Human-readable hint when a form action runs without the key configured. */
export function serviceRoleActionBlockedHint(): string {
  return "Add SUPABASE_SERVICE_ROLE_KEY to .env.local (see setup box on this page), then restart the dev server.";
}
