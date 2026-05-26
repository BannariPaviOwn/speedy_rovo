import { redirect } from "next/navigation";

/**
 * Lightweight root — never mount (app) layout / AdminShell here.
 * Middleware also redirects GET / → /login before auth work.
 * Logged-in users: /login middleware sends them to /slots.
 */
export default function RootPage() {
  redirect("/login");
}
