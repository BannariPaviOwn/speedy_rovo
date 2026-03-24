"use server";

import { usernamesForUserIds } from "@/lib/audit-usernames";
import { assertSuperadmin } from "@/lib/staff-admin-server";

/** Resolve login usernames for slot `updated_by` user ids (superadmin only). */
export async function resolveSlotEditorUsernames(
  userIds: string[],
): Promise<Record<string, string>> {
  await assertSuperadmin();
  const map = await usernamesForUserIds(userIds);
  return Object.fromEntries(map);
}
