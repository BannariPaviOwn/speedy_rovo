/**
 * This app has no user-facing email — staff sign in with username + password only.
 *
 * Supabase's password API still expects an "email-shaped" login id, so we derive one
 * from the username: `{username}@{NEXT_PUBLIC_USERNAME_EMAIL_DOMAIN}`. That string is
 * not a mailbox; it's an internal handle. End users never type or see `@…` in the app.
 *
 * Sign-in runs in the browser (`app/login/page.tsx`) so Supabase session cookies
 * update reliably when switching accounts; the mapped id is used when calling Auth.
 */

export function usernameEmailDomain(): string {
  return (
    process.env.NEXT_PUBLIC_USERNAME_EMAIL_DOMAIN ?? "speedy.user"
  );
}

/** Validates and lowercases username (2–32 chars: letter/digit start, then a-z0-9_-). */
export function parseUsername(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{1,31}$/.test(t)) {
    throw new Error(
      "Username must be 2–32 characters: start with a letter or number, then letters, numbers, _ or -.",
    );
  }
  return t;
}

/** Maps the username the user typed into the id Supabase Auth accepts for password login. */
export function usernameToAuthEmail(username: string): string {
  return `${parseUsername(username)}@${usernameEmailDomain()}`;
}

/** Show username in UI when the stored login id is our username-derived handle. */
export function authEmailToUsername(
  email: string | null | undefined,
): string | null {
  if (!email) {
    return null;
  }
  const d = usernameEmailDomain().toLowerCase();
  const lower = email.toLowerCase();
  const suffix = `@${d}`;
  if (lower.endsWith(suffix)) {
    return email.slice(0, email.length - suffix.length);
  }
  return email;
}

/**
 * Supabase error strings often say "email"; we show username-only sign-in in the UI.
 */
export function mapAuthSignInErrorForUsernameUi(message: string): string {
  const m = message.trim();
  if (/invalid login credentials/i.test(m)) {
    return "Invalid username or password.";
  }
  if (/email not confirmed|confirm your email/i.test(m)) {
    return "Account is not ready to sign in yet. Contact a superadmin.";
  }
  if (/invalid email/i.test(m)) {
    return "Invalid username.";
  }
  return m.replace(/\bemail address\b/gi, "username").replace(/\bemail\b/gi, "username");
}
