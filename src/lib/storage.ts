import { defaultSettings, demoRecords, demoRequests } from "../data";
import type { AuthUser, DiaryRecord, EditRequest, SelfieRecord, SystemSettings } from "../types";

const RECORDS_KEY = "tst-diary-records";
const REQUESTS_KEY = "tst-diary-requests";
const SESSION_KEY = "tst-diary-session";
const SELFIES_KEY = "tst-diary-selfies";
const SETTINGS_KEY = "tst-diary-settings";

function read<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadRecords(): DiaryRecord[] {
  return read(RECORDS_KEY, demoRecords).map((record) =>
    record.status === ("Edicao solicitada" as DiaryRecord["status"])
      ? { ...record, status: "Solicitacao enviada" }
      : record,
  );
}

export function saveRecords(records: DiaryRecord[]) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export function loadRequests(): EditRequest[] {
  const saved = read<EditRequest[]>(REQUESTS_KEY, demoRequests);
  const compatible = saved.filter((request) => request.originalRecord && request.proposedRecord);
  return compatible.length ? compatible : demoRequests;
}

export function saveRequests(requests: EditRequest[]) {
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
}

export function saveSession(user: AuthUser | null) {
  if (user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

export function loadSessionFromBrowser(): AuthUser | null {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    return saved ? (JSON.parse(saved) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function loadSelfies(): SelfieRecord[] {
  return read(SELFIES_KEY, []);
}

export function saveSelfie(selfie: SelfieRecord) {
  const current = loadSelfies();
  localStorage.setItem(SELFIES_KEY, JSON.stringify([selfie, ...current].slice(0, 100)));
}

export function saveSelfies(selfies: SelfieRecord[]) {
  localStorage.setItem(SELFIES_KEY, JSON.stringify(selfies));
}

export function loadSettings(): SystemSettings {
  const saved = read<SystemSettings>(SETTINGS_KEY, defaultSettings);
  const accounts = saved.accessAccounts ?? defaultSettings.accessAccounts;
  const hasFinancial = accounts.some((account) => account.role === "financeiro");
  return {
    technicians: saved.technicians?.length ? saved.technicians : defaultSettings.technicians,
    vessels: saved.vessels?.length ? saved.vessels : defaultSettings.vessels,
    accessAccounts: hasFinancial
      ? accounts
      : [...accounts, defaultSettings.accessAccounts.find((account) => account.role === "financeiro")!],
    allowSelfieDeletion: saved.allowSelfieDeletion ?? false,
  };
}

export function saveSettings(settings: SystemSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
