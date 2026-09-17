import type { DiaryRecord } from "../types";

export interface ActivityFact {
  activityId: string;
  recordId: string;
  date: string;
  year: number;
  monthNumber: number;
  month: string;
  yearMonth: string;
  technician: string;
  shift: string;
  activity: string;
  vessel: string;
  doubleShift: string;
  status: string;
  notes: string;
  createdAt: string;
}

export function flattenActivityFacts(records: DiaryRecord[]): ActivityFact[] {
  return records.flatMap((record) => {
    const date = new Date(`${record.date}T12:00:00`);
    const month = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(date);
    return record.turns.flatMap((turn, turnIndex) =>
      turn.vessels.map((vessel, vesselIndex) => ({
        activityId: `${record.id}-${turnIndex + 1}-${vesselIndex + 1}`,
        recordId: record.id,
        date: record.date,
        year: date.getFullYear(),
        monthNumber: date.getMonth() + 1,
        month,
        yearMonth: record.date.slice(0, 7),
        technician: record.technician,
        shift: turn.shift,
        activity: turn.activity,
        vessel,
        doubleShift: record.turns.length === 2 ? "Sim" : "Nao",
        status: record.status,
        notes: record.notes,
        createdAt: record.createdAt,
      })),
    );
  });
}
