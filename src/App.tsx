import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import {
  loadRecords,
  loadRequests,
  loadSessionFromBrowser,
  saveRecords,
  saveRequests,
  saveSession,
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

  useEffect(() => saveRecords(records), [records]);
  useEffect(() => saveRequests(requests), [requests]);

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
          ? { ...record, status: "Edicao solicitada" }
          : record,
      ),
    );
  }

  function updateRequest(id: string, status: "Aprovada" | "Rejeitada") {
    setRequests((current) =>
      current.map((request) => (request.id === id ? { ...request, status } : request)),
    );
  }

  if (!user) {
    return <Login onLogin={login} />;
  }

  return (
    <Layout user={user} onLogout={logout}>
      <Routes>
        <Route path="/" element={<Dashboard user={user} records={records} requests={requests} />} />
        <Route path="/novo" element={<NewDiary user={user} onSave={addRecord} />} />
        <Route path="/registros" element={<Records user={user} records={records} onRequest={addRequest} />} />
        <Route path="/solicitacoes" element={<Requests user={user} requests={requests} onStatusChange={updateRequest} />} />
        <Route path="/administracao" element={user.role === "admin" ? <Admin /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
