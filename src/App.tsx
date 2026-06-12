import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import {
  createRemoteRecord,
  createRemoteRequest,
  fetchBootstrap,
  fetchRemoteState,
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

  async function addRecord(record: DiaryRecord) {
    if (!isDemoMode && user) {
      try {
        await createRemoteRecord(user, record);
      } catch (error) {
        setRemoteError((error as Error).message);
        return;
      }
    }
    setRecords((current) => [record, ...current]);
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
        <Route path="/" element={user.role === "financeiro" ? <Navigate to="/registros" replace /> : <Dashboard user={user} records={records} requests={requests} />} />
        <Route
          path="/novo"
          element={
            user.role === "financeiro"
              ? <Navigate to="/registros" replace />
              : (
                <NewDiary
                  user={user}
                  settings={settings}
                  onSave={addRecord}
                  showPaymentWarning={showPaymentWarning}
                  onDismissPaymentWarning={() => setShowPaymentWarning(false)}
                />
              )
          }
        />
        <Route path="/registros" element={<Records user={user} records={records} settings={settings} onRequest={addRequest} />} />
        <Route path="/solicitacoes" element={user.role === "financeiro" ? <Navigate to="/registros" replace /> : <Requests user={user} requests={requests} onStatusChange={updateRequest} />} />
        <Route path="/administracao" element={["supervisor", "admin"].includes(user.role) ? <Admin user={user} settings={settings} onSettingsChange={changeSettings} /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
