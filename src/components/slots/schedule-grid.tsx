import type { SlotKind } from "@/lib/types";
import {
  SCHEDULE_END_HOUR,
  SCHEDULE_START_HOUR,
  SLOT_STEP_MINUTES,
  generateSlotTimes,
} from "@/lib/schedule-config";
import type { CourtInfo, ScheduleCell } from "@/lib/mock-schedule";

const cellEdge =
  "border-b border-r border-white/[0.06] md:border-[var(--border-subtle)]";

const kindInner: Record<SlotKind, string> = {
  booked:
    "border border-[var(--accent)]/45 bg-[var(--slot-booked)] text-[var(--accent)] shadow-[0_0_20px_-8px_rgba(193,255,0,0.35)]",
  reserved:
    "border border-purple-500/40 bg-[var(--slot-reserved)] text-purple-100",
  maintenance:
    "border border-rose-400/35 bg-[var(--slot-maintenance)] text-rose-50",
  available:
    "border border-[var(--slot-available-border)] bg-[var(--slot-available)] text-[var(--slot-available-text)] ring-1 ring-emerald-400/15",
  blocked:
    "border border-rose-600/45 bg-rose-950/70 text-rose-100 ring-1 ring-rose-500/25",
  membership:
    "border border-violet-500/45 bg-violet-950/55 text-violet-100 ring-1 ring-violet-500/18",
};

const defaultLabel: Record<Exclude<SlotKind, "available">, string> = {
  booked: "BOOKED",
  reserved: "RESERVED",
  maintenance: "MAINTENANCE",
  blocked: "BLOCKED",
  membership: "MEMBERSHIP",
};

function CellCard({ cell }: { cell: ScheduleCell }) {
  if (cell.kind === "available") {
    return (
      <div className="flex min-h-[82px] items-stretch px-1 py-1.5 md:min-h-[92px] md:p-2">
        <div
          className={[
            "flex w-full min-h-[56px] flex-col items-center justify-center gap-1 rounded-lg px-2.5 py-2.5 text-center",
            kindInner.available,
          ].join(" ")}
        >
          <span className="text-[11px] font-bold uppercase tracking-wide md:text-xs">
            Available
          </span>
          <span className="text-[10px] font-medium text-emerald-200/65 md:text-[11px]">
            Open to book
          </span>
        </div>
      </div>
    );
  }

  if (cell.kind === "membership") {
    const line1 = cell.label ?? defaultLabel.membership;
    return (
      <div className="flex min-h-[82px] items-stretch px-1 py-1.5 md:min-h-[92px] md:p-2">
        <div
          className={[
            "flex w-full flex-col justify-center gap-1.5 rounded-lg px-2.5 py-2.5 text-left",
            kindInner.membership,
          ].join(" ")}
        >
          <span className="text-[11px] font-bold uppercase tracking-wide md:text-xs">
            {line1}
          </span>
          {cell.membershipDetail ? (
            <span className="text-[10px] font-medium leading-snug text-violet-200/95 md:text-xs">
              {cell.membershipDetail}
            </span>
          ) : null}
          {cell.notes ? (
            <span className="line-clamp-2 text-[9px] font-medium leading-snug text-white/75 md:text-[11px]">
              {cell.notes}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  const line1 = cell.label ?? defaultLabel[cell.kind];
  const line2 = cell.subtitle;

  return (
    <div className="flex min-h-[82px] items-stretch px-1 py-1.5 md:min-h-[92px] md:p-2">
      <div
        className={[
          "flex w-full flex-col justify-center gap-1.5 rounded-lg px-2.5 py-2.5 text-left",
          kindInner[cell.kind],
        ].join(" ")}
      >
        <span className="text-[11px] font-bold uppercase tracking-wide md:text-xs">
          {line1}
        </span>
        {line2 ? (
          <span className="text-[10px] font-medium leading-snug text-white/88 md:text-xs md:leading-tight">
            {line2}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function ScheduleLegend({ className }: { className?: string }) {
  const items: { k: string; dot: string }[] = [
    { k: "Blocked", dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.35)]" },
    { k: "Booked", dot: "bg-[var(--accent)] shadow-[0_0_8px_rgba(193,255,0,0.45)]" },
    { k: "Membership", dot: "bg-violet-500" },
    { k: "Maintenance", dot: "bg-rose-400" },
    { k: "Reserved", dot: "bg-purple-500" },
    {
      k: "Available",
      dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.35)]",
    },
  ];
  return (
    <ul
      className={[
        "flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-[var(--text-muted)] md:text-[13px]",
        className ?? "",
      ].join(" ")}
    >
      {items.map(({ k, dot }) => (
        <li key={k} className="inline-flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
          {k}
        </li>
      ))}
    </ul>
  );
}

export function ScheduleGrid({
  courts,
  cells,
  onSlotClick,
}: {
  courts: CourtInfo[];
  cells: Map<string, ScheduleCell>;
  onSlotClick?: (args: {
    slotKey: string;
    cell: ScheduleCell;
    courtName: string;
    timeLabel: string;
  }) => void;
}) {
  const times = generateSlotTimes(
    SCHEDULE_START_HOUR,
    SCHEDULE_END_HOUR,
    SLOT_STEP_MINUTES,
  );

  const defaultCell: ScheduleCell = {
    kind: "blocked",
    label: "BLOCKED",
    subtitle: "—",
  };

  return (
    <div className="space-y-4 md:space-y-5">
      <ScheduleLegend className="md:justify-start" />

      <div
        className="scrollbar-thin max-h-[calc(100dvh-14rem)] overflow-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:max-h-[min(70vh,760px)] md:rounded-2xl"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <table className="w-max min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className={`sticky left-0 top-0 z-30 min-w-[60px] ${cellEdge} bg-[var(--bg-elevated)] px-2 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] md:min-w-[76px] md:text-xs`}
              >
                Time
              </th>
              {courts.map((court) => (
                <th
                  key={court.id}
                  scope="col"
                  className={`sticky top-0 z-20 min-w-[5.75rem] max-w-[5.75rem] ${cellEdge} bg-[var(--bg-elevated)] px-1 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-primary)] md:min-w-[8rem] md:max-w-none md:text-xs`}
                >
                  <span className="block truncate" title={court.name}>
                    {court.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map((t, ri) => (
              <tr
                key={t.key}
                className={
                  ri % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"
                }
              >
                <th
                  scope="row"
                  className={`sticky left-0 z-20 ${cellEdge} bg-[var(--bg-base)] px-2 py-2.5 text-left text-xs font-semibold tabular-nums text-[var(--text-primary)] md:text-sm`}
                >
                  {t.label}
                </th>
                {courts.map((court) => {
                  const key = `${court.id}::${t.key}`;
                  const cell = cells.get(key) ?? defaultCell;
                  const inner = <CellCard cell={cell} />;
                  return (
                    <td
                      key={court.id}
                      className={`${cellEdge} bg-[#141619] p-0 align-top`}
                    >
                      {onSlotClick ? (
                        <button
                          type="button"
                          className="group w-full cursor-pointer text-left transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]"
                          onClick={() =>
                            onSlotClick({
                              slotKey: key,
                              cell,
                              courtName: court.name,
                              timeLabel: t.label,
                            })
                          }
                        >
                          {inner}
                        </button>
                      ) : (
                        inner
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
