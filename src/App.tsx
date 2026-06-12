import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
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
import { Admin } from "./pages/Admin";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { NewDiary } from "./pages/NewDiary";
import { Records } from "./pages/Records";
import { Requests } from "./pages/Requests";
import type { AuthUser, DiaryRecord, EditRequest } from "./types";

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(loadSessionFromBrowser);
  const [records, setRecords] = useState<DiaryRecord[]>(loadRecords);
  const [requests, setRequests] = useState<EditRequest[]>(loadRequests);
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => saveRecords(records), [records]);
  useEffect(() => saveRequests(requests), [requests]);
  useEffect(() => saveSettings(settings), [settings]);

  function login(nextUser: AuthUser) {
    setUser(nextUser);
    saveSession(nextUser);
  }

  function logout() {
    setUser(null);
    saveSession(null);
  }

  function addRecord(record: DiaryRecord) {
    setRecords((current) => [record, ...current]);
  }

  function addRequest(request: EditRequest) {
    setRequests((current) => [request, ...current]);
    setRecords((current) =>
      current.map((record) =>
        record.id === request.recordId
          ? { ...record, status: "Solicitacao enviada" }
          : record,
      ),
    );
  }

  function updateRequest(id: string, status: "Aprovada" | "Rejeitada") {
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

  if (!user) {
    return <Login onLogin={login} settings={settings} />;
  }

  return (
    <Layout user={user} onLogout={logout}>
      <Routes>
        <Route path="/" element={user.role === "financeiro" ? <Navigate to="/registros" replace /> : <Dashboard user={user} records={records} requests={requests} />} />
        <Route path="/novo" element={user.role === "financeiro" ? <Navigate to="/registros" replace /> : <NewDiary user={user} settings={settings} onSave={addRecord} />} />
        <Route path="/registros" element={<Records user={user} records={records} settings={settings} onRequest={addRequest} />} />
        <Route path="/solicitacoes" element={user.role === "financeiro" ? <Navigate to="/registros" replace /> : <Requests user={user} requests={requests} onStatusChange={updateRequest} />} />
        <Route path="/administracao" element={user.role === "admin" ? <Admin settings={settings} onSettingsChange={setSettings} /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
