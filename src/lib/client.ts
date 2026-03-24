import { createBrowserClient } from "@supabase/ssr";

function publishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  );
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = publishableKey();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or a Supabase publishable key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). Add them in .env.local locally or in Vercel → Project → Settings → Environment Variables.",
    );
  }
  return createBrowserClient(url, key);
}
