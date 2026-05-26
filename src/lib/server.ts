import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getAuthCookieOptions,
  getSupabasePublishableKey,
  getSupabaseUrl,
  serverAuthClientOptions,
} from "@/lib/auth/supabase-env";

/**
 * If using Fluid compute: Don't put this client in a global variable. Always create a new client within each
 * function when using it.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or a Supabase publishable key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). Add them in .env.local locally or in Vercel → Project → Settings → Environment Variables.",
    );
  }

  const supabase = createServerClient(url, key, {
    cookieOptions: getAuthCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
    ...serverAuthClientOptions,
  });

  await supabase.auth.stopAutoRefresh();
  return supabase;
}
