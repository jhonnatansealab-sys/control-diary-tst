import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import {
  createRemoteRecord,
  createRemoteRequest,
  createRemoteScheduleRecord,
  deleteRemoteRecord,
  deleteRemoteScheduleRecord,
  fetchBootstrap,
  fetchRemoteState,
  updateRemoteRecord,
  updateRemoteRequest,
  updateRemoteScheduleRecord,
  updateRemoteScheduleStatus,
  updateRemoteSettings,
} from "./lib/api";
import {
  loadRecords,
  loadRequests,
  loadScheduleRecords,
  loadSessionFromBrowser,
  loadSettings,
  saveRecords,
  saveRequests,
  saveScheduleRecords,
  saveSession,
  saveSettings,
} from "./lib/storage";
import { isDemoMode } from "./lib/supabase";
import { Admin } from "./pages/Admin";
import { Analytics } from "./pages/Analytics";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { NewDiary } from "./pages/NewDiary";
import { Schedule } from "./pages/Schedule";
import { Records } from "./pages/Records";
import { Requests } from "./pages/Requests";
import type { AuthUser, DiaryRecord, EditRequest, ScheduleChangeLog, ScheduleRecord, ScheduleStatus } from "./types";

function scheduleSnapshot(record: ScheduleRecord) {
  return {
    vessel: record.vessel,
    scheduledAt: record.scheduledAt,
    osNumber: record.osNumber,
    serviceType: record.serviceType,
    status: record.status,
    region: record.region,
    post: record.post,
    dayTsts: record.dayTsts.map((item) => ({ ...item })),
    nightTsts: record.nightTsts.map((item) => ({ ...item })),
    cboSupports: record.cboSupports.map((item) => ({ ...item })),
    programs: record.programs.map((item) => ({ ...item })),
  };
}

function createScheduleChangeLog(
  type: ScheduleChangeLog["type"],
  summary: string,
  observation: string,
  changedBy: string,
  after: ScheduleRecord,
  before?: ScheduleRecord,
): ScheduleChangeLog {
  return {
    id: `LOG-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    type,
    summary,
    observation: observation.trim(),
    changedAt: new Date().toISOString(),
    changedBy,
    before: before ? scheduleSnapshot(before) : undefined,
    after: scheduleSnapshot(after),
  };
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(loadSessionFromBrowser);
  const [showPaymentWarning, setShowPaymentWarning] = useState(false);
  const [records, setRecords] = useState<DiaryRecord[]>(isDemoMode ? loadRecords() : []);
  const [requests, setRequests] = useState<EditRequest[]>(isDemoMode ? loadRequests() : []);
  const [scheduleRecords, setScheduleRecords] = useState<ScheduleRecord[]>(isDemoMode ? loadScheduleRecords() : []);
  const [settings, setSettings] = useState(loadSettings);
  const [remoteError, setRemoteError] = useState("");

  useEffect(() => {
    if (isDemoMode) saveRecords(records);
  }, [records]);

  useEffect(() => {
    if (isDemoMode) saveRequests(requests);
  }, [requests]);

  useEffect(() => {
    if (isDemoMode) saveScheduleRecords(scheduleRecords);
  }, [scheduleRecords]);

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
        setScheduleRecords(state.scheduleRecords ?? []);
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

  async function addScheduleRecord(scheduleRecord: ScheduleRecord) {
    if (!user || !["colaborador", "supervisor", "admin"].includes(user.role)) return false;
    if (!isDemoMode) {
      try {
        const response = await createRemoteScheduleRecord(user, scheduleRecord);
        scheduleRecord = { ...response.scheduleRecord, changeHistory: response.scheduleRecord.changeHistory ?? [] };
        setRemoteError("");
      } catch (error) {
        setRemoteError((error as Error).message);
        return false;
      }
    }
    setScheduleRecords((current) => [scheduleRecord, ...current]);
    return true;
  }

  async function changeScheduleStatus(id: string, status: ScheduleStatus, observation: string) {
    if (!user || !["supervisor", "admin"].includes(user.role)) return false;
    const currentRecord = scheduleRecords.find((record) => record.id === id);
    if (!currentRecord) return false;
    let nextRecord: ScheduleRecord = {
      ...currentRecord,
      status,
      changeHistory: [
        ...(currentRecord.changeHistory ?? []),
        createScheduleChangeLog(
          "Status",
          `Status alterado de ${currentRecord.status} para ${status}.`,
          observation,
          user.name,
          { ...currentRecord, status },
          currentRecord,
        ),
      ],
    };
    if (!isDemoMode) {
      try {
        const response = await updateRemoteScheduleStatus(user, id, status, observation);
        nextRecord = { ...response.scheduleRecord, changeHistory: response.scheduleRecord.changeHistory ?? [] };
        setRemoteError("");
      } catch (error) {
        setRemoteError((error as Error).message);
        return false;
      }
    }
    setScheduleRecords((current) => current.map((record) => (record.id === id ? nextRecord : record)));
    return true;
  }

  async function updateScheduleRecord(scheduleRecord: ScheduleRecord) {
    if (!user || !["supervisor", "admin"].includes(user.role)) return false;
    let nextRecord = scheduleRecord;
    if (!isDemoMode) {
      try {
        const response = await updateRemoteScheduleRecord(user, scheduleRecord);
        nextRecord = { ...response.scheduleRecord, changeHistory: response.scheduleRecord.changeHistory ?? [] };
        setRemoteError("");
      } catch (error) {
        setRemoteError((error as Error).message);
        return false;
      }
    }
    setScheduleRecords((current) => current.map((record) => (record.id === nextRecord.id ? nextRecord : record)));
    return true;
  }

  async function archiveScheduleRecord(id: string, archived: boolean, observation: string) {
    if (!user || !["supervisor", "admin"].includes(user.role)) return false;
    const currentRecord = scheduleRecords.find((record) => record.id === id);
    if (!currentRecord) return false;
    let nextRecord: ScheduleRecord = {
      ...currentRecord,
      archived,
      archivedAt: archived ? new Date().toISOString() : undefined,
      archivedBy: archived ? user.name : undefined,
    };
    nextRecord = {
      ...nextRecord,
      changeHistory: [
        ...(currentRecord.changeHistory ?? []),
        createScheduleChangeLog(
          "Arquivamento",
          archived ? "Programação arquivada." : "Programação restaurada dos arquivados.",
          observation,
          user.name,
          nextRecord,
          currentRecord,
        ),
      ],
    };
    if (!isDemoMode) {
      try {
        const response = await updateRemoteScheduleRecord(user, nextRecord);
        nextRecord = { ...response.scheduleRecord, changeHistory: response.scheduleRecord.changeHistory ?? [] };
        setRemoteError("");
      } catch (error) {
        setRemoteError((error as Error).message);
        return false;
      }
    }
    setScheduleRecords((current) => current.map((record) => (record.id === id ? nextRecord : record)));
    return true;
  }

  async function deleteScheduleRecord(id: string) {
    if (!user || !["supervisor", "admin"].includes(user.role)) return false;
    if (!isDemoMode) {
      try {
        await deleteRemoteScheduleRecord(user, id);
        setRemoteError("");
      } catch (error) {
        setRemoteError((error as Error).message);
        return false;
      }
    }
    setScheduleRecords((current) => current.filter((record) => record.id !== id));
    return true;
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
        <Route
          path="/programacao"
          element={
            ["colaborador", "financeiro", "supervisor", "admin"].includes(user.role)
              ? (
                <Schedule
                  user={user}
                  settings={settings}
                  records={scheduleRecords}
                  onCreate={addScheduleRecord}
                  onUpdate={updateScheduleRecord}
                  onArchive={archiveScheduleRecord}
                  onDelete={deleteScheduleRecord}
                  onStatusChange={changeScheduleStatus}
                />
              )
              : <Navigate to="/" replace />
          }
        />
        <Route path="/administracao" element={["supervisor", "admin"].includes(user.role) ? <Admin user={user} settings={settings} onSettingsChange={changeSettings} /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
