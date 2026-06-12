import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type Role = "colaborador" | "supervisor" | "financeiro" | "admin";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, x-app-session",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createToken() {
  const random = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(random)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function createSession(role: Role, name: string, username?: string) {
  const token = createToken();
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("app_sessions").insert({
    token_hash: tokenHash,
    role,
    name,
    username: username ?? null,
    expires_at: expiresAt,
  });
  if (error) throw error;
  return { token, expiresAt };
}

async function getSession(request: Request) {
  const token = request.headers.get("x-app-session");
  if (!token) return null;
  const tokenHash = await sha256(token);
  const { data, error } = await supabase
    .from("app_sessions")
    .select("role,name,username,expires_at")
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return data as { role: Role; name: string; username?: string; expires_at: string } | null;
}

async function getSettings(includeAdminSettings = false) {
  const [{ data: settings, error: settingsError }, { data: accounts, error: accountsError }] =
    await Promise.all([
      supabase
        .from("app_settings")
        .select("technicians,vessels,allow_selfie_deletion")
        .eq("id", true)
        .single(),
      includeAdminSettings
        ? supabase
          .from("app_access_accounts")
          .select("id,role,name,username,active")
          .order("created_at")
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (settingsError) throw settingsError;
  if (accountsError) throw accountsError;
  return {
    technicians: settings.technicians,
    vessels: settings.vessels,
    allowSelfieDeletion: includeAdminSettings ? settings.allow_selfie_deletion : false,
    accessAccounts: (accounts ?? []).map((account) => ({ ...account, password: "" })),
  };
}

async function requireSession(request: Request, roles?: Role[]) {
  const session = await getSession(request);
  if (!session) throw new Response("Sessao invalida ou expirada.", { status: 401 });
  if (roles && !roles.includes(session.role)) {
    throw new Response("Acesso nao autorizado.", { status: 403 });
  }
  return session;
}

async function readBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new Response("Corpo da requisicao invalido.", { status: 400 });
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (request.method === "GET" && action === "bootstrap") {
      return json({ settings: await getSettings(false) });
    }

    if (request.method === "POST" && action === "manager-login") {
      const body = await readBody(request);
      const { data: account, error } = await supabase
        .from("app_access_accounts")
        .select("id,role,name,username,active")
        .eq("role", body.role)
        .ilike("username", body.username ?? "")
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      if (!account) return json({ error: "Usuario ou senha incorretos." }, 401);
      const { data: passwordOk, error: passwordError } = await supabase.rpc(
        "verify_app_password",
        { account_id: account.id, candidate: body.password ?? "" },
      );
      if (passwordError) throw passwordError;
      if (!passwordOk) return json({ error: "Usuario ou senha incorretos." }, 401);
      const session = await createSession(account.role as Role, account.name, account.username);
      return json({
        user: {
          role: account.role,
          name: account.name,
          username: account.username,
          sessionToken: session.token,
        },
      });
    }

    if (request.method === "POST" && action === "collaborator-login") {
      const body = await readBody(request);
      const settings = await getSettings(false);
      if (!settings.technicians.includes(body.technician) || !body.imageData) {
        return json({ error: "Identificacao ou selfie invalida." }, 400);
      }
      const selfieId = `SELFIE-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      const capturedAt = new Date().toISOString();
      const { error } = await supabase.from("app_selfies").insert({
        id: selfieId,
        technician: body.technician,
        image_data: body.imageData,
        captured_at: capturedAt,
      });
      if (error) throw error;
      const session = await createSession("colaborador", body.technician);
      return json({
        user: {
          role: "colaborador",
          name: body.technician,
          selfieSessionId: selfieId,
          sessionToken: session.token,
        },
      });
    }

    if (request.method === "GET" && action === "state") {
      const session = await requireSession(request);
      let recordsQuery = supabase
        .from("app_diary_records")
        .select("payload")
        .order("work_date", { ascending: false })
        .order("created_at", { ascending: false });
      let requestsQuery = supabase
        .from("app_edit_requests")
        .select("payload")
        .order("created_at", { ascending: false });
      if (session.role === "colaborador") {
        recordsQuery = recordsQuery.eq("technician", session.name);
        requestsQuery = requestsQuery.eq("technician", session.name);
      }
      const [{ data: records, error: recordsError }, { data: requests, error: requestsError }] =
        await Promise.all([recordsQuery, requestsQuery]);
      if (recordsError) throw recordsError;
      if (requestsError) throw requestsError;
      return json({
        records: (records ?? []).map((item) => item.payload),
        requests: (requests ?? []).map((item) => item.payload),
        settings: await getSettings(session.role === "admin"),
      });
    }

    if (request.method === "POST" && action === "record") {
      const session = await requireSession(request, ["colaborador", "supervisor", "admin"]);
      const body = await readBody(request);
      const record = body.record;
      if (!record?.id || !record?.date || !record?.technician) {
        return json({ error: "Registro invalido." }, 400);
      }
      if (session.role === "colaborador" && record.technician !== session.name) {
        return json({ error: "Colaborador so pode registrar a propria diaria." }, 403);
      }
      const { error } = await supabase.from("app_diary_records").insert({
        id: record.id,
        work_date: record.date,
        technician: record.technician,
        payload: record,
      });
      if (error) throw error;
      return json({ record }, 201);
    }

    if (request.method === "POST" && action === "request") {
      const session = await requireSession(request, ["colaborador", "supervisor", "admin"]);
      const body = await readBody(request);
      const editRequest = body.request;
      if (!editRequest?.id || !editRequest?.recordId) {
        return json({ error: "Solicitacao invalida." }, 400);
      }
      if (session.role === "colaborador" && editRequest.technician !== session.name) {
        return json({ error: "Solicitacao nao autorizada." }, 403);
      }
      const updatedRecord = {
        ...editRequest.originalRecord,
        status: "Solicitacao enviada",
      };
      const [{ error: requestError }, { error: recordError }] = await Promise.all([
        supabase.from("app_edit_requests").insert({
          id: editRequest.id,
          record_id: editRequest.recordId,
          technician: editRequest.technician,
          status: editRequest.status,
          payload: editRequest,
        }),
        supabase
          .from("app_diary_records")
          .update({ payload: updatedRecord, updated_at: new Date().toISOString() })
          .eq("id", editRequest.recordId),
      ]);
      if (requestError) throw requestError;
      if (recordError) throw recordError;
      return json({ request: editRequest });
    }

    if (request.method === "PATCH" && action === "request-status") {
      await requireSession(request, ["supervisor", "admin"]);
      const body = await readBody(request);
      const { data: stored, error: findError } = await supabase
        .from("app_edit_requests")
        .select("payload")
        .eq("id", body.id)
        .single();
      if (findError) throw findError;
      const editRequest = stored.payload;
      const nextRequest = { ...editRequest, status: body.status };
      const nextRecord = body.status === "Aprovada"
        ? { ...editRequest.proposedRecord, status: "Corrigido" }
        : { ...editRequest.originalRecord, status: "Registrado" };
      const [{ error: requestError }, { error: recordError }] = await Promise.all([
        supabase
          .from("app_edit_requests")
          .update({
            status: body.status,
            payload: nextRequest,
            updated_at: new Date().toISOString(),
          })
          .eq("id", body.id),
        supabase
          .from("app_diary_records")
          .update({ payload: nextRecord, updated_at: new Date().toISOString() })
          .eq("id", editRequest.recordId),
      ]);
      if (requestError) throw requestError;
      if (recordError) throw recordError;
      return json({ request: nextRequest, record: nextRecord });
    }

    if (request.method === "PUT" && action === "settings") {
      const session = await requireSession(request, ["supervisor", "admin"]);
      const body = await readBody(request);
      const settings = body.settings;
      if (!Array.isArray(settings?.technicians) || !Array.isArray(settings?.vessels)) {
        return json({ error: "Configuracoes invalidas." }, 400);
      }
      if (session.role === "admin" && !Array.isArray(settings.accessAccounts)) {
        return json({ error: "Contas de acesso invalidas." }, 400);
      }
      const { error: settingsError } = await supabase
        .from("app_settings")
        .update({
          technicians: settings.technicians,
          vessels: settings.vessels,
          ...(session.role === "admin"
            ? { allow_selfie_deletion: settings.allowSelfieDeletion }
            : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", true);
      if (settingsError) throw settingsError;

      if (session.role === "admin") {
        const ids = settings.accessAccounts.map((account: { id: string }) => account.id);
        const { data: currentAccounts, error: currentAccountsError } = await supabase
          .from("app_access_accounts")
          .select("id");
        if (currentAccountsError) throw currentAccountsError;
        const removedIds = (currentAccounts ?? [])
          .map((account) => account.id)
          .filter((id) => !ids.includes(id));
        if (removedIds.length) {
          const { error: deleteError } = await supabase
            .from("app_access_accounts")
            .delete()
            .in("id", removedIds);
          if (deleteError) throw deleteError;
        }
        for (const account of settings.accessAccounts) {
          const { error } = await supabase.rpc("set_app_access_account", {
            account_id: account.id,
            account_role: account.role,
            account_name: account.name,
            account_username: account.username,
            account_password: account.password ?? "",
            account_active: account.active,
          });
          if (error) throw error;
        }
      }
      return json({ settings: await getSettings(session.role === "admin") });
    }

    if (request.method === "GET" && action === "selfies") {
      await requireSession(request, ["admin"]);
      const { data, error } = await supabase
        .from("app_selfies")
        .select("id,technician,image_data,captured_at")
        .order("captured_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return json({
        selfies: (data ?? []).map((selfie) => ({
          id: selfie.id,
          technician: selfie.technician,
          imageData: selfie.image_data,
          capturedAt: selfie.captured_at,
        })),
      });
    }

    if (request.method === "DELETE" && action === "selfie") {
      await requireSession(request, ["admin"]);
      const { data: settings, error: settingsError } = await supabase
        .from("app_settings")
        .select("allow_selfie_deletion")
        .eq("id", true)
        .single();
      if (settingsError) throw settingsError;
      if (!settings.allow_selfie_deletion) {
        return json({ error: "Exclusao de fotos desabilitada." }, 403);
      }
      const id = url.searchParams.get("id");
      const { error } = await supabase.from("app_selfies").delete().eq("id", id);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Rota nao encontrada." }, 404);
  } catch (error) {
    if (error instanceof Response) {
      return new Response(await error.text(), {
        status: error.status,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }
    console.error(error);
    return json({ error: "Falha interna ao processar a solicitacao." }, 500);
  }
});
