"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/server";
import { fetchStaffContext } from "@/lib/db/staff-queries";
import { clearStaffContextCookie, setStaffContextCookie } from "@/lib/auth/staff-cookie";
import { listSupabaseAuthCookieNames } from "@/lib/auth/supabase-env";
import {
  mapAuthSignInErrorForUsernameUi,
  usernameToAuthEmail,
} from "@/lib/username-auth";

export type SignInActionResult = { error: string };

function postLoginDestination(returnTo: string | null | undefined) {
  if (
    returnTo &&
    returnTo.startsWith("/") &&
    !returnTo.startsWith("//")
  ) {
    return returnTo;
  }
  return "/slots";
}

/**
 * Password sign-in via the server Supabase client so `sb-*-auth-token` cookies
 * are written through Next.js `cookies()` (SSR + middleware can read them).
 */
export async function signInAction(
  formData: FormData,
  returnTo?: string | null,
): Promise<SignInActionResult | undefined> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  let email: string;
  try {
    email = usernameToAuthEmail(username);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Invalid username.",
    };
  }

  if (!password) {
    return { error: "Password is required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: mapAuthSignInErrorForUsernameUi(error.message) };
  }

  if (!data.session) {
    return {
      error: "Sign-in succeeded but no session was returned. Try again.",
    };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return {
      error:
        "Sign-in succeeded but session cookies were not saved. Clear site data and try again.",
    };
  }

  try {
    const staffCtx = await fetchStaffContext(supabase, data.session.user.id, {
      accessToken: data.session.access_token,
      skipSessionWait: true,
    });
    await setStaffContextCookie(staffCtx);
    if (process.env.NODE_ENV === "development") {
      console.log("[signInAction] staff context", {
        userId: data.session.user.id,
        role: staffCtx?.role ?? null,
      });
    }
  } catch (err) {
    await clearStaffContextCookie();
    console.error("[signInAction] staff_roles lookup failed", err);
  }

  if (process.env.NODE_ENV === "development") {
    const authCookieNames = listSupabaseAuthCookieNames(
      (await cookies()).getAll(),
    );
    console.log("[signInAction] Supabase auth cookies set:", authCookieNames);
  }

  revalidatePath("/", "layout");
  redirect(postLoginDestination(returnTo));
}

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
  await clearStaffContextCookie();
  revalidatePath("/", "layout");
  redirect("/login");
}
