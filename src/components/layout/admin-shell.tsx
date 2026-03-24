"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
  BarChart3,
  CalendarClock,
  HelpCircle,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  Plus,
  Search,
  Settings,
  Shield,
  Users,
  LayoutGrid,
  Bell,
  type LucideIcon,
} from "lucide-react";
import { useRole } from "@/components/providers/role-provider";
import type { AdminRole } from "@/lib/types";
import { authEmailToUsername } from "@/lib/username-auth";

type ShellNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: AdminRole[];
};

const navItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["superadmin", "admin"],
  },
  {
    href: "/slots",
    label: "Schedule",
    icon: CalendarClock,
    roles: ["superadmin", "admin"],
  },
  {
    href: "/venues",
    label: "Venues",
    icon: MapPin,
    roles: ["superadmin"],
  },
  {
    href: "/bookings",
    label: "Bookings",
    icon: Users,
    roles: ["superadmin", "admin"],
  },
  {
    href: "/admins",
    label: "Admins",
    icon: Shield,
    roles: ["superadmin"],
  },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  mobile,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  mobile?: boolean;
}) {
  if (mobile) {
    return (
      <Link
        href={href}
        className={[
          "flex min-w-0 flex-1 flex-col items-center gap-1 py-1.5 text-[10px] font-semibold transition-colors",
          active
            ? "text-[var(--accent)]"
            : "text-[var(--text-muted)] active:opacity-80",
        ].join(" ")}
      >
        <span
          className={[
            "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
            active
              ? "bg-[var(--accent)]/18 text-[var(--accent)] ring-1 ring-[var(--accent)]/25"
              : "text-[var(--text-muted)]",
          ].join(" ")}
        >
          <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
        </span>
        <span className="max-w-full truncate px-0.5">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        "justify-start md:px-4",
        active
          ? "bg-[var(--accent-dim)] text-[var(--accent)]"
          : "text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text-primary)]",
      ].join(" ")}
    >
      <Icon className="h-5 w-5 shrink-0 md:h-[18px] md:w-[18px]" strokeWidth={1.75} />
      {label}
    </Link>
  );
}

function DesktopTopBar() {
  const { session, user, role, loading, signOut } = useRole();
  const isStaff = role === "admin" || role === "superadmin";
  const roleLabel =
    role === "superadmin" ? "SUPERADMIN" : role === "admin" ? "ADMIN" : null;

  return (
    <header className="hidden border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/90 px-6 py-4 backdrop-blur-md md:block">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative min-w-[200px] max-w-xl flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="search"
            placeholder="Search bookings…"
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none ring-0 transition focus:border-[var(--accent)]/40 focus:ring-1 focus:ring-[var(--accent)]/30"
            aria-label="Search bookings"
          />
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {!session && !loading ? (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[var(--accent)] transition hover:bg-white/[0.04]"
            >
              <LogIn className="h-4 w-4" strokeWidth={2} />
              Sign in
            </Link>
          ) : null}
          <button
            type="button"
            className="rounded-xl p-2.5 text-[var(--text-muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--text-primary)]"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="rounded-xl p-2.5 text-[var(--text-muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--text-primary)]"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <div className="flex items-center gap-3 border-l border-[var(--border-subtle)] pl-4">
            <div
              className="h-10 w-10 shrink-0 rounded-full border border-[var(--border-subtle)] bg-gradient-to-br from-[var(--accent)]/50 to-zinc-700"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {user?.email
                  ? (authEmailToUsername(user.email) ?? user.email)
                  : "Guest"}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                {loading
                  ? "…"
                  : !session
                    ? "NOT SIGNED IN"
                    : isStaff && roleLabel
                      ? roleLabel
                      : "NO STAFF ACCESS"}
              </p>
            </div>
            {session ? (
              <button
                type="button"
                onClick={() => {
                  void signOut();
                }}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-[var(--text-muted)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
              >
                Sign out
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role, session, signOut } = useRole();
  const isStaff = role === "admin" || role === "superadmin";

  const visible: ShellNavItem[] = useMemo(() => {
    if (!session) {
      return [
        { href: "/", label: "Dashboard", icon: LayoutDashboard },
        { href: "/slots", label: "Schedule", icon: CalendarClock },
        { href: "/login", label: "Sign in", icon: LogIn },
      ];
    }
    if (!isStaff) {
      return [
        { href: "/", label: "Dashboard", icon: LayoutDashboard },
        { href: "/slots", label: "Schedule", icon: CalendarClock },
      ];
    }
    return navItems
      .filter((item) => item.roles.includes(role!))
      .map((item) => ({
        href: item.href,
        label: item.label,
        icon: item.icon,
      }));
  }, [session, isStaff, role]);

  return (
    <div className="mesh-bg relative min-h-dvh">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-[var(--mesh-1)] blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[var(--mesh-2)] blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-dvh max-w-[1600px] flex-col md:flex-row md:mx-auto">
        {/* Desktop sidebar */}
        <aside className="glass-panel hidden w-[260px] shrink-0 flex-col border-r border-[var(--border-subtle)] px-4 py-6 md:flex md:min-h-dvh">
          <div className="mb-8 flex items-start gap-3 px-1">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)] shadow-lg shadow-[var(--accent)]/15">
              <LayoutGrid className="h-6 w-6" strokeWidth={2} />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="font-display text-base font-bold leading-tight tracking-tight text-[var(--text-primary)]">
                Speedy
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Booking management
              </p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {visible.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href)
                }
              />
            ))}
            <Link
              href="#"
              className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text-primary)] md:px-4"
            >
              <BarChart3 className="h-5 w-5 shrink-0" strokeWidth={1.75} />
              Analytics
            </Link>
          </nav>

          <div className="mt-6 space-y-3">
            <Link
              href="/bookings"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-[var(--accent-foreground)] shadow-lg shadow-[var(--accent)]/15 transition hover:brightness-105"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              New booking
            </Link>
            <div className="flex gap-2 border-t border-[var(--border-subtle)] pt-4">
              <Link
                href="#"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <HelpCircle className="h-4 w-4" />
                Support
              </Link>
              <button
                type="button"
                onClick={() => {
                  void signOut();
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col pb-20 md:pb-0">
          {/* Mobile header */}
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/90 px-3 py-3 backdrop-blur-md md:hidden">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)]">
                <LayoutGrid className="h-5 w-5" strokeWidth={2} />
              </span>
              <div>
                <p className="font-display text-sm font-bold leading-tight">
                  Speedy
                </p>
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
                  Booking management
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {!session ? (
                <Link
                  href="/login"
                  className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--accent)]"
                >
                  Sign in
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    void signOut();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] transition hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
                  aria-label="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
                  Sign out
                </button>
              )}
            </div>
          </header>

          <DesktopTopBar />

          <main className="flex-1 px-2 py-4 pb-6 md:px-8 md:py-8 md:pb-8">
            {children}
          </main>
        </div>

        <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch justify-around border-t border-[var(--border-subtle)] bg-[var(--bg-base)]/98 px-1 py-1.5 backdrop-blur-lg md:hidden safe-area-pb">
          {visible.slice(0, 5).map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              mobile
              active={
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href)
              }
            />
          ))}
        </nav>
      </div>
    </div>
  );
}
