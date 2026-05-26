import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
import {
  browserAuthClientOptions,
  getAuthCookieOptions,
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/auth/supabase-env";

let browserClient: SupabaseClient | undefined;

/** Single browser Supabase client — avoids gotrue storage lock races. */
export function createClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error(
      "createClient() from @/lib/client is browser-only. Use @/lib/server in Server Components, actions, and middleware.",
    );
  }

  if (browserClient) {
    return browserClient;
  }

  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or a Supabase publishable key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). Add them in .env.local locally or in Vercel → Project → Settings → Environment Variables.",
    );
  }

  browserClient = createBrowserClient(url, key, {
    cookieOptions: getAuthCookieOptions(),
    ...browserAuthClientOptions,
    isSingleton: true,
  });
  return browserClient;
}
