"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { AdminRole } from "@/lib/types";

type RoleContextValue = {
  role: AdminRole;
  setRole: (role: AdminRole) => void;
  toggleRole: () => void;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<AdminRole>("admin");

  const toggleRole = useCallback(() => {
    setRole((r) => (r === "superadmin" ? "admin" : "superadmin"));
  }, []);

  const value = useMemo(
    () => ({ role, setRole, toggleRole }),
    [role, toggleRole],
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
