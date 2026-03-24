"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { signOutAction } from "@/app/auth/actions";
import { createClient } from "@/lib/client";
import { fetchStaffContext } from "@/lib/db/staff-queries";
import type { AdminRole } from "@/lib/types";

type RoleContextValue = {
  session: Session | null;
  user: User | null;
  /** From `staff_roles`; null if not signed in or no row */
  role: AdminRole | null;
  /** `staff_roles.venue_id` — set for admins; null for superadmins */
  venueId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  /** Created in `useEffect` only so `next build` prerender never calls `createClient()` (no env on CI until Vercel vars are set). */
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      setSupabase(createClient());
    } catch {
      setLoading(false);
    }
  }, []);

  const applyUser = useCallback(
    async (u: User | null) => {
      if (!u) {
        setRole(null);
        setVenueId(null);
        return;
      }
      if (!supabase) {
        return;
      }
      try {
        const ctx = await fetchStaffContext(supabase, u.id);
        setRole(ctx?.role ?? null);
        setVenueId(ctx?.venueId ?? null);
      } catch {
        setRole(null);
        setVenueId(null);
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const {
        data: { session: s },
      } = await supabase.auth.getSession();
      if (cancelled) {
        return;
      }
      setSession(s);
      setUser(s?.user ?? null);
      await applyUser(s?.user ?? null);
      if (!cancelled) {
        setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        await applyUser(s?.user ?? null);
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase, applyUser]);

  const signOut = useCallback(async () => {
    await signOutAction();
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      role,
      venueId,
      loading,
      signOut,
    }),
    [session, user, role, venueId, loading, signOut],
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
