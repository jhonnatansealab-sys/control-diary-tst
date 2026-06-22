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

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function toCsv(rows: ActivityFact[]) {
  const headers: (keyof ActivityFact)[] = [
    "activityId", "recordId", "date", "year", "monthNumber", "month",
    "yearMonth", "technician", "shift", "activity", "vessel", "doubleShift",
    "status", "notes", "createdAt",
  ];
  const labels = [
    "IdAtividade", "IdRegistro", "Data", "Ano", "MesNumero", "Mes",
    "AnoMes", "Tecnico", "Turno", "Atividade", "Embarcacao", "Dobra",
    "Status", "Observacoes", "CriadoEm",
  ];
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
  return [
    labels.map(escape).join(";"),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(";")),
  ].join("\r\n");
}

export function dateRange(start: string, end: string) {
  if (!start || !end || start > end) return [];
  const dates: string[] = [];
  const current = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}
