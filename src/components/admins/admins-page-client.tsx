"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  adminStaffMutationAction,
  createAdminAction,
  type AdminMutationState,
  type CreateAdminState,
} from "@/app/(app)/admins/actions";
import { Button } from "@/components/ui/button";
import type {
  StaffDirectoryRow,
  VenueOption,
} from "@/lib/staff-admin-server";

const initialCreateState: CreateAdminState = {
  ok: false,
  error: null,
};

const initialMutationState: AdminMutationState = {
  ok: false,
  error: null,
};

export function AdminsPageClient({
  rows,
  venues,
  currentUserId,
}: {
  rows: StaffDirectoryRow[];
  venues: VenueOption[];
  currentUserId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [createState, createAction, createPending] = useActionState(
    createAdminAction,
    initialCreateState,
  );
  const [mutationState, mutationAction, mutationPending] = useActionState(
    adminStaffMutationAction,
    initialMutationState,
  );

  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (createState.ok) {
      formRef.current?.reset();
    }
  }, [createState.ok]);

  useEffect(() => {
    if (mutationState.ok) {
      setEditingUserId(null);
    }
  }, [mutationState.ok]);

  const superadminCount = rows.filter((r) => r.role === "superadmin").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
          Admins
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--text-muted)]">
          Create venue admins with a username, password, and which venue they
          manage. Change an admin&apos;s venue or remove their access below.
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Invite admin
        </h2>
        <form ref={formRef} action={createAction} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label
                htmlFor="admin-username"
                className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
              >
                Username
              </label>
              <input
                id="admin-username"
                name="username"
                type="text"
                required
                autoComplete="off"
                placeholder="court_lead"
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]/40 focus:ring-1 focus:ring-[var(--accent)]/30"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="admin-password"
                className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
              >
                Initial password
              </label>
              <input
                id="admin-password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]/40 focus:ring-1 focus:ring-[var(--accent)]/30"
              />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <label
                htmlFor="admin-venue"
                className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
              >
                Venue scope
              </label>
              <select
                id="admin-venue"
                name="venueId"
                required
                disabled={venues.length === 0}
                defaultValue=""
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]/40 focus:ring-1 focus:ring-[var(--accent)]/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>
                  {venues.length === 0
                    ? "Add a venue under Venues first"
                    : "Select venue…"}
                </option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {createState.error ? (
            <p
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100/90"
              role="alert"
            >
              {createState.error}
            </p>
          ) : null}
          {createState.ok ? (
            <p
              className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100/90"
              role="status"
            >
              Admin created. They can sign in with the username and password you
              set.
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={createPending}
            className="rounded-xl bg-[var(--accent)] px-6 py-5 text-sm font-bold text-[var(--accent-foreground)] hover:brightness-105 disabled:opacity-60"
          >
            {createPending ? "Creating…" : "Create admin"}
          </Button>
        </form>
      </section>

      <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
        <div className="border-b border-[var(--border-subtle)] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Staff accounts ({rows.length})
        </div>
        {mutationState.error ? (
          <p
            className="border-b border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-100/90"
            role="alert"
          >
            {mutationState.error}
          </p>
        ) : null}
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border-subtle)] bg-black/25 text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">
                Venue scope
              </th>
              <th className="px-4 py-3 font-medium">Access</th>
              <th className="hidden px-4 py-3 font-medium lg:table-cell">
                Row audit
              </th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-[var(--text-muted)]"
                >
                  No staff accounts yet.
                </td>
              </tr>
            ) : (
              rows.map((a) => {
                const isSelf = a.userId === currentUserId;
                const isAdminRole = a.role === "admin";
                const canDeleteSuperadmin =
                  a.role === "superadmin" && superadminCount > 1;
                const canDelete =
                  !isSelf &&
                  (a.role === "admin" || canDeleteSuperadmin);
                const editing = editingUserId === a.userId;

                return (
                  <tr
                    key={a.userId}
                    className="border-b border-[var(--border-subtle)] last:border-0"
                  >
                    <td className="px-4 py-4 font-medium text-[var(--text-primary)]">
                      {a.username ?? "—"}
                    </td>
                    <td className="px-4 py-4 capitalize text-[var(--text-muted)]">
                      {a.role}
                    </td>
                    <td className="hidden px-4 py-4 text-[var(--text-muted)] sm:table-cell">
                      {editing && isAdminRole ? (
                        <form
                          action={mutationAction}
                          className="flex flex-col gap-2 sm:flex-row sm:items-center"
                        >
                          <input type="hidden" name="intent" value="update_venue" />
                          <input type="hidden" name="userId" value={a.userId} />
                          <select
                            name="venueId"
                            defaultValue={a.venueId ?? ""}
                            required
                            disabled={venues.length === 0 || mutationPending}
                            className="max-w-[220px] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/40"
                          >
                            {a.venueId &&
                            !venues.some((v) => v.id === a.venueId) ? (
                              <option value={a.venueId}>
                                {a.venueName ?? "Current venue (inactive)"}
                              </option>
                            ) : null}
                            {venues.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-1">
                            <Button
                              type="submit"
                              size="sm"
                              disabled={mutationPending || venues.length === 0}
                              className="h-8 rounded-lg bg-[var(--accent)] px-2 text-xs font-bold text-[var(--accent-foreground)]"
                            >
                              {mutationPending ? "…" : "Save"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg px-2 text-xs"
                              onClick={() => setEditingUserId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      ) : a.role === "superadmin" ? (
                        "All venues"
                      ) : (
                        (a.venueName ?? "—")
                      )}
                    </td>
                    <td className="px-4 py-4 text-[var(--text-muted)]">
                      {a.isActive && a.rowStatus === "active" ? (
                        <span className="text-emerald-200/90">Active</span>
                      ) : (
                        <span className="text-amber-200/90">
                          {a.rowStatus}
                          {!a.isActive ? " · disabled" : ""}
                        </span>
                      )}
                    </td>
                    <td className="hidden max-w-[14rem] px-4 py-4 text-xs leading-snug text-[var(--text-muted)] lg:table-cell">
                      {a.createdByUsername ? (
                        <span className="block">
                          By {a.createdByUsername}
                          {a.updatedByUsername &&
                          a.updatedByUsername !== a.createdByUsername
                            ? ` → ${a.updatedByUsername}`
                            : ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        {isAdminRole && !editing ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg px-2"
                            onClick={() => setEditingUserId(a.userId)}
                            disabled={venues.length === 0}
                            title="Change venue"
                          >
                            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <form action={mutationAction}>
                            <input type="hidden" name="intent" value="delete" />
                            <input type="hidden" name="userId" value={a.userId} />
                            <Button
                              type="submit"
                              variant="destructive"
                              size="sm"
                              className="h-8 rounded-lg px-2"
                              disabled={mutationPending}
                              title="Remove staff access and delete login"
                              onClick={(e) => {
                                const label = a.username ?? a.userId;
                                if (
                                  !confirm(
                                    `Remove "${label}"? Their staff access and login will be deleted.`,
                                  )
                                ) {
                                  e.preventDefault();
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                            </Button>
                          </form>
                        ) : null}
                        {isSelf ? (
                          <span className="px-1 text-[10px] text-[var(--text-muted)]">
                            You
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
