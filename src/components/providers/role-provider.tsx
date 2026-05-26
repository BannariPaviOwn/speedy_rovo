"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { signOutAction } from "@/app/auth/actions";
import { createClient } from "@/lib/client";
import { fetchStaffContext } from "@/lib/db/staff-queries";
import { formatSupabaseError } from "@/lib/db/supabase-errors";
import {
  AUTH_RATE_LIMIT_USER_MESSAGE,
  isAuthRateLimitError,
} from "@/lib/auth/session-errors";
import type { StaffAuthContext } from "@/lib/auth/staff-auth-context";
import type { AdminRole } from "@/lib/types";

type RoleContextValue = {
  session: Session | null;
  user: User | null;
  /** From `staff_roles`; null if not signed in or no row */
  role: AdminRole | null;
  /** `staff_roles.venue_id` — set for admins; null for superadmins */
  venueId: string | null;
  loading: boolean;
  /** Non-fatal auth notice (e.g. rate limit) */
  authNotice: string | null;
  signOut: () => Promise<void>;
};

const RoleContext = createContext<RoleContextValue | null>(null);

type RoleProviderProps = {
  children: React.ReactNode;
  initial?: StaffAuthContext;
};

const emptyAuth: StaffAuthContext = {
  user: null,
  session: null,
  role: null,
  venueId: null,
};

function isLoginPath(pathname: string | null) {
  return pathname === "/login" || pathname?.startsWith("/login/") === true;
}

function hasServerAuth(ctx: StaffAuthContext) {
  return Boolean(ctx.user);
}

function hasCompleteServerAuth(ctx: StaffAuthContext) {
  return Boolean(ctx.user && ctx.role);
}

export function RoleProvider({ children, initial }: RoleProviderProps) {
  const pathname = usePathname();
  const onLoginRoute = isLoginPath(pathname);
  const serverAuthRef = useRef<StaffAuthContext>(initial ?? emptyAuth);
  const staffLoadedForUserIdRef = useRef<string | null>(
    initial?.user?.id && initial?.role ? initial.user.id : null,
  );
  const staffFetchInflightRef = useRef<{
    userId: string;
    promise: Promise<{ role: AdminRole | null; venueId: string | null }>;
  } | null>(null);
  const sessionReadRef = useRef(false);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(
    initial?.session ?? null,
  );
  const [user, setUser] = useState<User | null>(initial?.user ?? null);
  const [role, setRole] = useState<AdminRole | null>(initial?.role ?? null);
  const [venueId, setVenueId] = useState<string | null>(
    initial?.venueId ?? null,
  );
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(
    () =>
      !onLoginRoute &&
      !hasCompleteServerAuth(initial ?? emptyAuth),
  );

  useEffect(() => {
    if (initial?.user) {
      serverAuthRef.current = initial;
      setSession(initial.session ?? null);
      setUser(initial.user);
      setRole(initial.role ?? null);
      setVenueId(initial.venueId ?? null);
      if (initial.role) {
        staffLoadedForUserIdRef.current = initial.user.id;
      }
      if (hasCompleteServerAuth(initial)) {
        setLoading(false);
      }
    }
  }, [initial]);

  useEffect(() => {
    if (onLoginRoute) {
      return;
    }
    try {
      const client = createClient();
      void client.auth.stopAutoRefresh();
      setSupabase(client);
    } catch {
      setLoading(false);
    }
  }, [onLoginRoute]);

  const loadStaffContext = useCallback(
    async (u: User, client: SupabaseClient) => {
      if (staffLoadedForUserIdRef.current === u.id && serverAuthRef.current.role) {
        return {
          role: serverAuthRef.current.role,
          venueId: serverAuthRef.current.venueId,
        };
      }

      const inflight = staffFetchInflightRef.current;
      if (inflight?.userId === u.id) {
        return inflight.promise;
      }

      const promise = (async () => {
        try {
          const ctx = await fetchStaffContext(client, u.id, {
            skipSessionWait: true,
          });
          const nextRole = ctx?.role ?? null;
          const nextVenueId = ctx?.venueId ?? null;
          setRole(nextRole);
          setVenueId(nextVenueId);
          if (nextRole) {
            staffLoadedForUserIdRef.current = u.id;
          }
          setAuthNotice(null);
          return { role: nextRole, venueId: nextVenueId };
        } catch (err) {
          const msg = formatSupabaseError(err);
          console.error(
            "[RoleProvider] staff role lookup failed",
            msg,
            { userId: u.id },
          );
          if (isAuthRateLimitError(msg)) {
            setAuthNotice(AUTH_RATE_LIMIT_USER_MESSAGE);
            if (serverAuthRef.current.role) {
              return {
                role: serverAuthRef.current.role,
                venueId: serverAuthRef.current.venueId,
              };
            }
          }
          if (serverAuthRef.current.role) {
            return {
              role: serverAuthRef.current.role,
              venueId: serverAuthRef.current.venueId,
            };
          }
          setRole(null);
          setVenueId(null);
          return { role: null, venueId: null };
        }
      })();

      staffFetchInflightRef.current = { userId: u.id, promise };
      try {
        return await promise;
      } finally {
        if (staffFetchInflightRef.current?.userId === u.id) {
          staffFetchInflightRef.current = null;
        }
      }
    },
    [],
  );

  const hydrateFromAuth = useCallback(
    async (s: Session | null, u: User, client: SupabaseClient) => {
      setSession(s);
      setUser(u);
      const { role: nextRole, venueId: nextVenueId } = await loadStaffContext(
        u,
        client,
      );
      serverAuthRef.current = {
        user: u,
        session: s,
        role: nextRole,
        venueId: nextVenueId,
      };
      setLoading(false);
    },
    [loadStaffContext],
  );

  const scheduleHydrate = useCallback(
    (s: Session | null, u: User, client: SupabaseClient, forceStaffFetch = false) => {
      if (
        !forceStaffFetch &&
        staffLoadedForUserIdRef.current === u.id &&
        serverAuthRef.current.role
      ) {
        setSession(s);
        setUser(u);
        setLoading(false);
        return;
      }

      void hydrateFromAuth(s, u, client);
    },
    [hydrateFromAuth],
  );

  useEffect(() => {
    if (!supabase || onLoginRoute) {
      return;
    }

    let cancelled = false;
    const skipClientStaffFetch = hasCompleteServerAuth(serverAuthRef.current);

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (cancelled) {
        return;
      }

      if (event === "SIGNED_OUT") {
        serverAuthRef.current = emptyAuth;
        staffLoadedForUserIdRef.current = null;
        staffFetchInflightRef.current = null;
        sessionReadRef.current = false;
        setSession(null);
        setUser(null);
        setRole(null);
        setVenueId(null);
        setAuthNotice(null);
        setLoading(false);
        return;
      }

      if (s?.user) {
        const sameUser = serverAuthRef.current.user?.id === s.user.id;
        if (
          sameUser &&
          serverAuthRef.current.role &&
          (event === "INITIAL_SESSION" ||
            event === "TOKEN_REFRESHED" ||
            event === "SIGNED_IN")
        ) {
          setSession(s);
          setUser(s.user);
          setLoading(false);
          return;
        }
        const forceStaffFetch = event === "SIGNED_IN" && !serverAuthRef.current.role;
        scheduleHydrate(s, s.user, supabase, forceStaffFetch);
        return;
      }

      if (!serverAuthRef.current.user) {
        setSession(null);
        setUser(null);
        setRole(null);
        setVenueId(null);
        setLoading(false);
      }
    });

    if (skipClientStaffFetch) {
      setLoading(false);
    } else if (hasServerAuth(serverAuthRef.current)) {
      const seeded = serverAuthRef.current;
      if (seeded.user) {
        scheduleHydrate(seeded.session, seeded.user, supabase, !seeded.role);
      }
    } else if (!sessionReadRef.current) {
      sessionReadRef.current = true;
      setLoading(true);
      void supabase.auth.getSession().then(({ data: { session: s }, error }) => {
        if (cancelled) {
          return;
        }
        if (error) {
          const msg = formatSupabaseError(error);
          if (isAuthRateLimitError(msg)) {
            setAuthNotice(AUTH_RATE_LIMIT_USER_MESSAGE);
          }
          setLoading(false);
          return;
        }
        if (s?.user) {
          scheduleHydrate(s, s.user, supabase);
          return;
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase, scheduleHydrate, onLoginRoute]);

  const signOut = useCallback(async () => {
    serverAuthRef.current = emptyAuth;
    staffLoadedForUserIdRef.current = null;
    staffFetchInflightRef.current = null;
    sessionReadRef.current = false;
    await signOutAction();
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      role,
      venueId,
      loading,
      authNotice,
      signOut,
    }),
    [session, user, role, venueId, loading, authNotice, signOut],
  );

  return (
    <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error("useRole must be used within RoleProvider");
  }
  return ctx;
}
