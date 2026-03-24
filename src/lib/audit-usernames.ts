import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { authEmailToUsername } from "@/lib/username-auth";

/** Resolve display usernames for auth user ids (admin API; batch sequential). */
export async function usernamesForUserIds(
  ids: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  const admin = createSupabaseAdmin();
  const map = new Map<string, string>();
  for (const id of unique) {
    const { data, error } = await admin.auth.admin.getUserById(id);
    if (error || !data?.user) {
      continue;
    }
    const label = authEmailToUsername(data.user.email ?? null);
    map.set(id, label ?? id.slice(0, 8) + "…");
  }
  return map;
}
