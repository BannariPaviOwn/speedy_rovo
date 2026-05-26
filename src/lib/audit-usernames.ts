import { createClient } from "@/lib/server";
import {
  createSupabaseAdmin,
  hasSupabaseServiceRole,
} from "@/lib/supabase-admin";
import { authEmailToUsername } from "@/lib/username-auth";

function fallbackUserLabel(id: string): string {
  return `${id.slice(0, 8)}…`;
}

/**
 * Resolve login usernames from `staff_roles.login_username` (superadmin may list all rows).
 * Works without SUPABASE_SERVICE_ROLE_KEY when migrations have backfilled the column.
 */
async function staffLoginUsernamesForUserIds(
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) {
    return map;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_roles")
    .select("user_id, login_username")
    .in("user_id", ids);
  if (error || !data) {
    return map;
  }
  for (const row of data) {
    const userId = row.user_id as string;
    const username = (row.login_username as string | null)?.trim();
    if (username) {
      map.set(userId, username);
    }
  }
  return map;
}

/**
 * Resolve display usernames for auth user ids.
 *
 * 1. Auth Admin API when `SUPABASE_SERVICE_ROLE_KEY` is set (any auth user).
 * 2. Else `staff_roles.login_username` via the signed-in client (superadmin lists all staff).
 * 3. Else short id prefix.
 */
export async function usernamesForUserIds(
  ids: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  const map = new Map<string, string>();
  if (unique.length === 0) {
    return map;
  }

  const unresolved = new Set(unique);

  if (hasSupabaseServiceRole()) {
    const admin = createSupabaseAdmin();
    for (const id of unique) {
      const { data, error } = await admin.auth.admin.getUserById(id);
      if (error || !data?.user) {
        continue;
      }
      const label = authEmailToUsername(data.user.email ?? null);
      if (label) {
        map.set(id, label);
        unresolved.delete(id);
      }
    }
  }

  if (unresolved.size > 0) {
    const staffMap = await staffLoginUsernamesForUserIds([...unresolved]);
    for (const [id, label] of staffMap) {
      map.set(id, label);
    }
  }

  for (const id of unique) {
    if (!map.has(id)) {
      map.set(id, fallbackUserLabel(id));
    }
  }

  return map;
}
