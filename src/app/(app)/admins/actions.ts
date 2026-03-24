"use server";

import { revalidatePath } from "next/cache";
import {
  createAdminUser,
  deleteStaffMember,
  updateAdminVenueScope,
} from "@/lib/staff-admin-server";

export type CreateAdminState = {
  ok: boolean;
  error: string | null;
};

export type AdminMutationState = {
  ok: boolean;
  error: string | null;
};

const mutationOk: AdminMutationState = { ok: true, error: null };

/** Single state for venue update + delete so success/error don’t overlap. */
export async function adminStaffMutationAction(
  _prev: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  const intent = String(formData.get("intent") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!userId) {
    return { ok: false, error: "Missing user." };
  }
  try {
    if (intent === "update_venue") {
      const venueId = String(formData.get("venueId") ?? "");
      await updateAdminVenueScope({ userId, venueId });
    } else if (intent === "delete") {
      await deleteStaffMember(userId);
    } else {
      return { ok: false, error: "Unknown action." };
    }
    revalidatePath("/admins");
    return mutationOk;
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : intent === "delete"
            ? "Could not remove admin."
            : "Could not update venue scope.",
    };
  }
}

export async function createAdminAction(
  _prev: CreateAdminState,
  formData: FormData,
): Promise<CreateAdminState> {
  try {
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");
    const venueId = String(formData.get("venueId") ?? "");
    await createAdminUser({ username, password, venueId });
    revalidatePath("/admins");
    return { ok: true, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Something went wrong.";
    return { ok: false, error: message };
  }
}
