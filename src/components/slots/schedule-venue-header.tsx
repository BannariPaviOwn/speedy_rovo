"use client";

import type { ReactNode } from "react";
import { Check, ChevronDown, Copy, Phone, User } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { VenueAdminContact } from "@/lib/db/staff-queries";

function digitsOnly(s: string) {
  return s.replace(/\D/g, "");
}

function AdminContactChip({
  displayName,
  phone,
}: {
  displayName?: string | null;
  phone?: string | null;
}) {
  const trimmedPhone = phone?.trim() ?? "";
  const tel = trimmedPhone ? digitsOnly(trimmedPhone) : "";
  const label = displayName?.trim() || null;
  const [copied, setCopied] = useState(false);

  if (!label && !trimmedPhone) {
    return null;
  }

  return (
    <div className="flex max-w-full min-w-0 items-stretch gap-3 rounded-2xl border border-white/[0.09] bg-[#14171c] px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_24px_rgba(0,0,0,0.35)]">
      <div className="flex shrink-0 items-center self-center">
        {trimmedPhone ? (
          <Phone
            className="h-[1.125rem] w-[1.125rem] text-[var(--accent)]"
            strokeWidth={2}
            aria-hidden
          />
        ) : (
          <User
            className="h-[1.125rem] w-[1.125rem] text-[var(--accent)]"
            strokeWidth={2}
            aria-hidden
          />
        )}
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5 leading-snug">
        {label ? (
          <span className="truncate text-[15px] font-medium tracking-tight text-[var(--text-primary)]">
            {label}
          </span>
        ) : null}
        {trimmedPhone ? (
          <a
            href={tel ? `tel:${tel}` : undefined}
            className="truncate text-sm font-medium tabular-nums text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
          >
            {trimmedPhone}
          </a>
        ) : null}
      </div>
      {trimmedPhone ? (
        <div className="flex shrink-0 items-center border-l border-white/[0.08] pl-2.5">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(tel).then(
                () => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                },
                () => {},
              );
            }}
            className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-white/[0.07] hover:text-[var(--accent)]"
            aria-label="Copy number to dial"
          >
            <Copy className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      ) : null}
      {copied ? (
        <span className="sr-only" role="status">
          Copied
        </span>
      ) : null}
    </div>
  );
}

function VenuePicker({
  venues,
  selectedVenueId,
  onVenueChange,
  label,
}: {
  venues: { id: string; name: string }[];
  selectedVenueId: string | null;
  onVenueChange: (id: string | null) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selectedName =
    venues.find((v) => v.id === selectedVenueId)?.name ?? "Select venue";

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        close();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        id="schedule-venue-picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full min-w-0 max-w-full items-center gap-2 rounded-xl py-1 text-left transition hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]/50 sm:max-w-lg sm:pr-2"
      >
        <span className="min-w-0 truncate font-display text-xl font-bold tracking-tight text-[var(--accent)] md:text-2xl">
          {selectedName}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[var(--accent)] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={2.5}
          aria-hidden
        />
        <span className="sr-only">{label}</span>
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-labelledby="schedule-venue-picker-trigger"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-white/[0.1] bg-[#1a1d22] py-1 shadow-[0_16px_48px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)_inset] sm:right-auto sm:min-w-[min(100%,280px)]"
        >
          {venues.map((v) => {
            const selected = v.id === selectedVenueId;
            return (
              <button
                key={v.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onVenueChange(v.id);
                  close();
                }}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${
                  selected
                    ? "bg-[var(--accent)]/16 text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {v.name}
                </span>
                {selected ? (
                  <Check
                    className="h-4 w-4 shrink-0 text-[var(--accent)]"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function ScheduleVenueHeader({
  role,
  venues,
  selectedVenueId,
  onVenueChange,
  loading,
  emptyVenuesMessage,
  contacts,
  slotWindowLine,
  secondaryLine,
  scheduleSports,
  selectedSportId,
  onSportChange,
  sportsLoading,
}: {
  role: "superadmin" | "admin";
  venues: { id: string; name: string }[];
  selectedVenueId: string | null;
  onVenueChange: (id: string | null) => void;
  loading: boolean;
  emptyVenuesMessage?: ReactNode;
  contacts: (VenueAdminContact & { displayName?: string | null })[];
  slotWindowLine?: string | null;
  secondaryLine?: ReactNode;
  /** Sports offered at the selected venue (schedule grid filter). */
  scheduleSports?: { id: string; name: string }[];
  selectedSportId?: string | null;
  onSportChange?: (sportId: string) => void;
  sportsLoading?: boolean;
}) {
  const visibleContacts = contacts.filter(
    (c) =>
      Boolean(c.displayName?.trim()) || Boolean(c.contactPhone?.trim()),
  );

  const label =
    role === "admin" ? "View venue" : "Current venue";

  return (
    <div className="space-y-3 pb-4">
      <div className="rounded-2xl border border-white/[0.07] bg-[var(--bg-elevated)]/75 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
          {label}
        </p>

        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading venues…</p>
        ) : venues.length === 0 ? (
          <div className="text-sm text-[var(--text-muted)]">
            {emptyVenuesMessage ?? "No venues available."}
          </div>
        ) : (
          <>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
            <div className="min-w-0 flex-1">
              {venues.length === 1 ? (
                <p className="font-display text-xl font-bold tracking-tight text-[var(--accent)] md:text-2xl">
                  {venues[0].name}
                </p>
              ) : (
                <VenuePicker
                  venues={venues}
                  selectedVenueId={selectedVenueId}
                  onVenueChange={onVenueChange}
                  label={label}
                />
              )}
            </div>

            {visibleContacts.length > 0 ? (
              <div className="flex w-full min-w-0 flex-col gap-2 sm:max-w-md lg:w-auto lg:max-w-sm lg:shrink-0">
                {visibleContacts.length > 1 ? (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Venue contacts
                  </p>
                ) : null}
                <div className="flex flex-col gap-2 sm:items-end">
                  {visibleContacts.map((c) => (
                    <AdminContactChip
                      key={c.userId}
                      displayName={c.displayName}
                      phone={c.contactPhone}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {scheduleSports && scheduleSports.length > 0 ? (
            <div className="mt-4 border-t border-white/[0.06] pt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Schedule sport
              </p>
              {sportsLoading ? (
                <p className="text-sm text-[var(--text-muted)]">Loading…</p>
              ) : scheduleSports.length === 1 ? (
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {scheduleSports[0].name}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {scheduleSports.map((s) => {
                    const active = s.id === selectedSportId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onSportChange?.(s.id)}
                        className={[
                          "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                          active
                            ? "border-[var(--accent)]/50 bg-[var(--accent)]/15 text-[var(--accent)]"
                            : "border-white/[0.08] bg-[#14171c] text-[var(--text-muted)] hover:border-white/[0.14] hover:text-[var(--text-primary)]",
                        ].join(" ")}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
          </>
        )}
      </div>

      {slotWindowLine ? (
        <p className="px-0.5 text-xs text-[var(--text-muted)]">{slotWindowLine}</p>
      ) : null}

      {secondaryLine ? (
        <div className="px-0.5 text-xs text-[var(--text-muted)]">
          {secondaryLine}
        </div>
      ) : null}
    </div>
  );
}
