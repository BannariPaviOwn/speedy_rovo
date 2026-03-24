"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/server";

/**
 * Clears the Supabase session in httpOnly cookies, then sends the user to the
 * staff sign-in page (`/login`).
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
