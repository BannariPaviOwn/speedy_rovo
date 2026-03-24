"use client";

import { useCallback, useState } from "react";
import { ScheduleGrid } from "@/components/slots/schedule-grid";
import { SlotEditModal } from "@/components/slots/slot-edit-modal";
import {
  buildMockScheduleGrid,
  mockCourts,
  type ScheduleCell,
} from "@/lib/mock-schedule";

export function ScheduleInteractive() {
  const [cells, setCells] = useState(() => buildMockScheduleGrid());
  const [edit, setEdit] = useState<{
    slotKey: string;
    courtName: string;
    timeLabel: string;
    cell: ScheduleCell;
  } | null>(null);

  const handleSlotClick = useCallback(
    (args: {
      slotKey: string;
      cell: ScheduleCell;
      courtName: string;
      timeLabel: string;
    }) => {
      setEdit({
        slotKey: args.slotKey,
        courtName: args.courtName,
        timeLabel: args.timeLabel,
        cell: args.cell,
      });
    },
    [],
  );

  const handleSave = (next: ScheduleCell) => {
    if (!edit) return;
    setCells((prev) => {
      const m = new Map(prev);
      m.set(edit.slotKey, next);
      return m;
    });
    setEdit(null);
  };

  return (
    <>
      <ScheduleGrid
        courts={mockCourts}
        cells={cells}
        onSlotClick={handleSlotClick}
      />
      {edit ? (
        <SlotEditModal
          key={edit.slotKey}
          courtName={edit.courtName}
          timeLabel={edit.timeLabel}
          initialCell={edit.cell}
          onSave={handleSave}
          onClose={() => setEdit(null)}
        />
      ) : null}
    </>
  );
}
