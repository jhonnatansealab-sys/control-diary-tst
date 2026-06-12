export type Role = "colaborador" | "supervisor" | "financeiro" | "admin";
export type Shift = "Diurno" | "Noturno";
export type Activity = "Area" | "ADM";
export type RecordStatus = "Registrado" | "Solicitacao enviada" | "Corrigido";
export type RequestStatus = "Pendente" | "Aprovada" | "Rejeitada";

export interface AuthUser {
  role: Role;
  name: string;
  username?: string;
  selfieSessionId?: string;
  sessionToken?: string;
}

export interface SelfieRecord {
  id: string;
  technician: string;
  imageData: string;
  capturedAt: string;
}

export interface AccessAccount {
  id: string;
  role: Exclude<Role, "colaborador">;
  name: string;
  username: string;
  password: string;
  active: boolean;
}

export interface SystemSettings {
  technicians: string[];
  vessels: string[];
  accessAccounts: AccessAccount[];
  allowSelfieDeletion: boolean;
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
  originalRecord: DiaryRecord;
  proposedRecord: DiaryRecord;
  status: RequestStatus;
  createdAt: string;
}
