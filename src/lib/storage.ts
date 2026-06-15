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

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Safari private mode and embedded browsers may block persistent storage.
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
  write(RECORDS_KEY, records);
}

export function loadRequests(): EditRequest[] {
  const saved = read<EditRequest[]>(REQUESTS_KEY, demoRequests);
  const compatible = saved.filter((request) => request.originalRecord && request.proposedRecord);
  return compatible.length ? compatible : demoRequests;
}

export function saveRequests(requests: EditRequest[]) {
  write(REQUESTS_KEY, requests);
}

export function saveSession(user: AuthUser | null) {
  try {
    if (user) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // The active React session still works when browser storage is unavailable.
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
  write(SELFIES_KEY, [selfie, ...current].slice(0, 100));
}

export function saveSelfies(selfies: SelfieRecord[]) {
  write(SELFIES_KEY, selfies);
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
  write(SETTINGS_KEY, settings);
}
