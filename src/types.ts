export type Role = "colaborador" | "supervisor" | "admin";
export type Shift = "Diurno" | "Noturno";
export type Activity = "Area" | "ADM";
export type RecordStatus = "Registrado" | "Edicao solicitada" | "Corrigido";
export type RequestStatus = "Pendente" | "Aprovada" | "Rejeitada";

export interface AuthUser {
  role: Role;
  name: string;
  username?: string;
  selfieSessionId?: string;
}

export interface SelfieRecord {
  id: string;
  technician: string;
  imageData: string;
  capturedAt: string;
}

export interface TurnEntry {
  shift: Shift;
  activity: Activity;
  vessels: string[];
}

export interface DiaryRecord {
  id: string;
  date: string;
  technician: string;
  turns: TurnEntry[];
  notes: string;
  status: RecordStatus;
  createdAt: string;
  selfieSessionId?: string;
}

export interface EditRequest {
  id: string;
  recordId: string;
  technician: string;
  date: string;
  reason: string;
  requestedChange: string;
  status: RequestStatus;
  createdAt: string;
}
