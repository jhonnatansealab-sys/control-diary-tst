import type {
  AuthUser,
  DiaryRecord,
  EditRequest,
  Role,
  SelfieRecord,
  SystemSettings,
} from "../types";
import { supabasePublishableKey, supabaseUrl } from "./supabase";

interface RemoteState {
  records: DiaryRecord[];
  requests: EditRequest[];
  settings: SystemSettings;
}

async function request<T>(
  action: string,
  options: RequestInit = {},
  sessionToken?: string,
): Promise<T> {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Supabase nao configurado.");
  }
  const response = await fetch(
    `${supabaseUrl}/functions/v1/diary-api?action=${encodeURIComponent(action)}`,
    {
      ...options,
      headers: {
        apikey: supabasePublishableKey,
        "Content-Type": "application/json",
        ...(sessionToken ? { "x-app-session": sessionToken } : {}),
        ...options.headers,
      },
    },
  );
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : { error: await response.text() };
  if (!response.ok) {
    throw new Error(body.error || "Nao foi possivel concluir a operacao.");
  }
  return body as T;
}

export async function fetchBootstrap() {
  return request<{ settings: SystemSettings }>("bootstrap");
}

export async function managerLogin(role: Role, username: string, password: string) {
  return request<{ user: AuthUser }>("manager-login", {
    method: "POST",
    body: JSON.stringify({ role, username, password }),
  });
}

export async function collaboratorLogin(technician: string, imageData: string) {
  return request<{ user: AuthUser }>("collaborator-login", {
    method: "POST",
    body: JSON.stringify({ technician, imageData }),
  });
}

export async function fetchRemoteState(user: AuthUser) {
  return request<RemoteState>("state", {}, user.sessionToken);
}

export async function createRemoteRecord(user: AuthUser, record: DiaryRecord) {
  return request<{ record: DiaryRecord }>(
    "record",
    { method: "POST", body: JSON.stringify({ record }) },
    user.sessionToken,
  );
}

export async function createRemoteRequest(user: AuthUser, editRequest: EditRequest) {
  return request<{ request: EditRequest }>(
    "request",
    { method: "POST", body: JSON.stringify({ request: editRequest }) },
    user.sessionToken,
  );
}

export async function updateRemoteRequest(
  user: AuthUser,
  id: string,
  status: "Aprovada" | "Rejeitada",
) {
  return request<{ request: EditRequest; record: DiaryRecord }>(
    "request-status",
    { method: "PATCH", body: JSON.stringify({ id, status }) },
    user.sessionToken,
  );
}

export async function updateRemoteSettings(user: AuthUser, settings: SystemSettings) {
  return request<{ settings: SystemSettings }>(
    "settings",
    { method: "PUT", body: JSON.stringify({ settings }) },
    user.sessionToken,
  );
}

export async function fetchRemoteSelfies(user: AuthUser) {
  return request<{ selfies: SelfieRecord[] }>("selfies", {}, user.sessionToken);
}

export async function deleteRemoteSelfie(user: AuthUser, id: string) {
  if (!supabaseUrl || !supabasePublishableKey) throw new Error("Supabase nao configurado.");
  const response = await fetch(
    `${supabaseUrl}/functions/v1/diary-api?action=selfie&id=${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: {
        apikey: supabasePublishableKey,
        "x-app-session": user.sessionToken ?? "",
      },
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Falha ao excluir foto." }));
    throw new Error(body.error || "Falha ao excluir foto.");
  }
}
