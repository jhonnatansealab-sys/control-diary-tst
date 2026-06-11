import { demoRecords, demoRequests } from "../data";
import type { AuthUser, DiaryRecord, EditRequest, SelfieRecord } from "../types";

const RECORDS_KEY = "tst-diary-records";
const REQUESTS_KEY = "tst-diary-requests";
const SESSION_KEY = "tst-diary-session";
const SELFIES_KEY = "tst-diary-selfies";

function read<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadRecords(): DiaryRecord[] {
  return read(RECORDS_KEY, demoRecords);
}

export function saveRecords(records: DiaryRecord[]) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export function loadRequests(): EditRequest[] {
  return read(REQUESTS_KEY, demoRequests);
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
