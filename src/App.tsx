import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import {
  createRemoteRecord,
  createRemoteRequest,
  deleteRemoteRecord,
  fetchBootstrap,
  fetchRemoteState,
  updateRemoteRecord,
  updateRemoteRequest,
  updateRemoteSettings,
} from "./lib/api";
import {
  loadRecords,
  loadRequests,
  loadSessionFromBrowser,
  loadSettings,
  saveRecords,
  saveRequests,
  saveSession,
  saveSettings,
} from "./lib/storage";
import { isDemoMode } from "./lib/supabase";
import { Admin } from "./pages/Admin";
import { Analytics } from "./pages/Analytics";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { NewDiary } from "./pages/NewDiary";
import { Records } from "./pages/Records";
import { Requests } from "./pages/Requests";
import type { AuthUser, DiaryRecord, EditRequest } from "./types";

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(loadSessionFromBrowser);
  const [showPaymentWarning, setShowPaymentWarning] = useState(false);
  const [records, setRecords] = useState<DiaryRecord[]>(isDemoMode ? loadRecords() : []);
  const [requests, setRequests] = useState<EditRequest[]>(isDemoMode ? loadRequests() : []);
  const [settings, setSettings] = useState(loadSettings);
  const [remoteError, setRemoteError] = useState("");

  useEffect(() => {
    if (isDemoMode) saveRecords(records);
  }, [records]);

  useEffect(() => {
    if (isDemoMode) saveRequests(requests);
  }, [requests]);

  useEffect(() => {
    if (isDemoMode) saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (isDemoMode) return;
    fetchBootstrap()
      .then(({ settings: nextSettings }) => setSettings(nextSettings))
      .catch((error: Error) => setRemoteError(error.message));
  }, []);

  useEffect(() => {
    if (isDemoMode || !user?.sessionToken) return;
    fetchRemoteState(user)
      .then((state) => {
        setRecords(state.records);
        setRequests(state.requests);
        setSettings(state.settings);
        setRemoteError("");
      })
      .catch((error: Error) => {
        setRemoteError(error.message);
        if (/sessao/i.test(error.message)) logout();
      });
  }, [user]);

  function login(nextUser: AuthUser) {
    setUser(nextUser);
    setShowPaymentWarning(nextUser.role === "colaborador");
    saveSession(nextUser);
  }

  function logout() {
    setUser(null);
    setShowPaymentWarning(false);
    saveSession(null);
  }

  async function addRecord(record: DiaryRecord): Promise<string | null> {
    if (
      user?.role === "colaborador" &&
      records.some(
        (existing) =>
          existing.technician === record.technician &&
          existing.date === record.date,
      )
    ) {
      return "Voce ja possui uma diaria registrada nesta data.";
    }
    if (!isDemoMode && user) {
      try {
        await createRemoteRecord(user, record);
      } catch (error) {
        const message = (error as Error).message;
        setRemoteError(message);
        return message;
      }
    }
    setRecords((current) => [record, ...current]);
    setRemoteError("");
    return null;
  }

  async function addRequest(request: EditRequest) {
    if (!isDemoMode && user) {
      try {
        await createRemoteRequest(user, request);
      } catch (error) {
        setRemoteError((error as Error).message);
        return;
      }
    }
    setRequests((current) => [request, ...current]);
    setRecords((current) =>
      current.map((record) =>
        record.id === request.recordId
          ? { ...record, status: "Solicitacao enviada" }
          : record,
      ),
    );
  }

  async function updateRecord(record: DiaryRecord) {
    if (!user || user.role !== "admin") return false;
    let nextRecord = { ...record, status: "Corrigido" } as DiaryRecord;
    let rejectedRequestIds: string[] = [];
    if (!isDemoMode) {
      try {
        const response = await updateRemoteRecord(user, nextRecord);
        nextRecord = response.record;
        rejectedRequestIds = response.rejectedRequestIds;
        setRemoteError("");
      } catch (error) {
        setRemoteError((error as Error).message);
        return false;
      }
    }
    setRecords((current) =>
      current.map((item) => (item.id === nextRecord.id ? nextRecord : item)),
    );
    setRequests((current) =>
      current.map((request) =>
        request.recordId === nextRecord.id &&
        request.status === "Pendente" &&
        (!rejectedRequestIds.length || rejectedRequestIds.includes(request.id))
          ? { ...request, status: "Rejeitada" }
          : request,
      ),
    );
    return true;
  }

  async function deleteRecord(id: string) {
    if (!user || user.role !== "admin") return false;
    if (!isDemoMode) {
      try {
        await deleteRemoteRecord(user, id);
        setRemoteError("");
      } catch (error) {
        setRemoteError((error as Error).message);
        return false;
      }
    }
    setRecords((current) => current.filter((record) => record.id !== id));
    setRequests((current) => current.filter((request) => request.recordId !== id));
    return true;
  }

  async function updateRequest(id: string, status: "Aprovada" | "Rejeitada") {
    if (!isDemoMode && user) {
      try {
        await updateRemoteRequest(user, id, status);
      } catch (error) {
        setRemoteError((error as Error).message);
        return;
      }
    }
    const request = requests.find((item) => item.id === id);
    setRequests((current) =>
      current.map((request) => (request.id === id ? { ...request, status } : request)),
    );
    if (request) {
      setRecords((current) =>
        current.map((record) =>
          record.id === request.recordId
            ? status === "Aprovada"
              ? { ...request.proposedRecord, status: "Corrigido" }
              : { ...record, status: "Registrado" }
            : record,
        ),
      );
    }
  }

  async function changeSettings(nextSettings: typeof settings) {
    if (!isDemoMode && user) {
      try {
        const response = await updateRemoteSettings(user, nextSettings);
        setSettings(response.settings);
        setRemoteError("");
        return;
      } catch (error) {
        setRemoteError((error as Error).message);
        return;
      }
    }
    setSettings(nextSettings);
  }

  if (!user) {
    return <Login onLogin={login} settings={settings} />;
  }

  return (
    <Layout user={user} onLogout={logout}>
      {remoteError && <div className="error-banner remote-error-banner">{remoteError}</div>}
      <Routes>
        <Route path="/" element={user.role === "financeiro" ? <Navigate to="/relatorios" replace /> : <Dashboard user={user} records={records} requests={requests} />} />
        <Route
          path="/novo"
          element={
            user.role === "financeiro"
              ? <Navigate to="/registros" replace />
              : (
                <NewDiary
                  user={user}
                  records={records}
                  settings={settings}
                  onSave={addRecord}
                  showPaymentWarning={showPaymentWarning}
                  onDismissPaymentWarning={() => setShowPaymentWarning(false)}
                />
              )
          }
        />
        <Route
          path="/registros"
          element={
            <Records
              user={user}
              records={records}
              settings={settings}
              onRequest={addRequest}
              onAdminUpdate={updateRecord}
              onAdminDelete={deleteRecord}
            />
          }
        />
        <Route path="/solicitacoes" element={user.role === "financeiro" ? <Navigate to="/registros" replace /> : <Requests user={user} requests={requests} onStatusChange={updateRequest} />} />
        <Route
          path="/relatorios"
          element={
            ["financeiro", "supervisor", "admin"].includes(user.role)
              ? <Analytics records={records} settings={settings} />
              : <Navigate to="/" replace />
          }
        />
        <Route path="/administracao" element={["supervisor", "admin"].includes(user.role) ? <Admin user={user} settings={settings} onSettingsChange={changeSettings} /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
