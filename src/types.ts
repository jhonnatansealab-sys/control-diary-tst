export type Role = "colaborador" | "supervisor" | "financeiro" | "admin";
export type Shift = "Diurno" | "Noturno" | "Não informado";
export type Activity = "Area" | "ADM" | "Não informado";
export type RecordStatus = "Registrado" | "Solicitacao enviada" | "Corrigido";
export type RequestStatus = "Pendente" | "Aprovada" | "Rejeitada";
export type ScheduleStatus = "Programado" | "Em andamento" | "Concluído" | "Cancelado";
export type ScheduleServiceType = "Operacional" | "DOC&CON" | "Base";

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

export interface ServiceRegion {
  id: string;
  name: string;
  posts: string[];
}

export interface SystemSettings {
  technicians: string[];
  vessels: string[];
  accessAccounts: AccessAccount[];
  allowSelfieDeletion: boolean;
  serviceRegions: ServiceRegion[];
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

export interface ScheduleContact {
  id: string;
  name: string;
  contact: string;
  inTraining?: boolean;
}

export interface ScheduleProgramTurn {
  shift: "Diurno" | "Noturno";
  timeRange: string;
}

export interface ScheduleChangeSnapshot {
  vessel: string;
  scheduledAt: string;
  osNumber: string;
  serviceType: ScheduleServiceType;
  status: ScheduleStatus;
  region: string;
  post: string;
  dayTsts: ScheduleContact[];
  nightTsts: ScheduleContact[];
  cboSupports: ScheduleContact[];
  programs: ScheduleProgramTurn[];
}

export interface ScheduleChangeLog {
  id: string;
  type: "Criação" | "Edição" | "Status" | "Arquivamento";
  summary: string;
  observation: string;
  changedAt: string;
  changedBy: string;
  before?: ScheduleChangeSnapshot;
  after: ScheduleChangeSnapshot;
}

export interface ScheduleRecord {
  id: string;
  vessel: string;
  scheduledAt: string;
  osNumber: string;
  serviceType: ScheduleServiceType;
  status: ScheduleStatus;
  region: string;
  post: string;
  dayTsts: ScheduleContact[];
  nightTsts: ScheduleContact[];
  cboSupports: ScheduleContact[];
  programs: ScheduleProgramTurn[];
  createdAt: string;
  createdBy: string;
  archived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  changeHistory?: ScheduleChangeLog[];
}
