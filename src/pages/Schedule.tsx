import {
  Archive,
  ArchiveRestore,
  CalendarClock,
  CheckCircle2,
  Clock,
  Eye,
  History,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Search,
  Ship,
  SlidersHorizontal,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type {
  AuthUser,
  ScheduleContact,
  ScheduleChangeLog,
  ScheduleProgramTurn,
  ScheduleRecord,
  ScheduleServiceType,
  ScheduleStatus,
  SystemSettings,
} from "../types";

interface ScheduleProps {
  user: AuthUser;
  settings: SystemSettings;
  records: ScheduleRecord[];
  onCreate: (record: ScheduleRecord) => Promise<boolean>;
  onUpdate: (record: ScheduleRecord) => Promise<boolean>;
  onArchive: (id: string, archived: boolean, observation: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onStatusChange: (id: string, status: ScheduleStatus, observation: string) => Promise<boolean>;
}

type ScheduleDraft = Omit<ScheduleRecord, "id" | "createdAt" | "createdBy">;
type ScheduleFilters = {
  status: ScheduleStatus | "Todos";
  vessel: string;
  serviceType: ScheduleServiceType | "Todos";
  from: string;
  to: string;
};

const statuses: ScheduleStatus[] = ["Programado", "Em andamento", "Concluído", "Cancelado"];
const serviceTypes: ScheduleServiceType[] = ["Operacional", "DOC&CON", "Base"];
const phonePattern = /^\(\d{2}\)\s\d{5}-\d{4}$/;

function createClientId(prefix: string) {
  const random = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().slice(0, 8)
    : `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  return `${prefix}-${random}`;
}

function emptyContact(prefix: string): ScheduleContact {
  return { id: createClientId(prefix), name: "", contact: "" };
}

function defaultProgram(shift: "Diurno" | "Noturno"): ScheduleProgramTurn {
  return {
    shift,
    timeRange: shift === "Diurno" ? "07:00-19:00HRS" : "19:00-07:00HRS",
  };
}

function emptyDraft(vessels: string[]): ScheduleDraft {
  return {
    vessel: vessels[0] ?? "",
    scheduledAt: "",
    osNumber: "",
    serviceType: "Operacional",
    status: "Programado",
    dayTsts: [emptyContact("day")],
    nightTsts: [emptyContact("night")],
    cboSupports: [emptyContact("cbo")],
    programs: [defaultProgram("Diurno"), defaultProgram("Noturno")],
  };
}

function toDateTimeLocalInput(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function cloneDraft(record: ScheduleRecord): ScheduleDraft {
  return {
    vessel: record.vessel,
    scheduledAt: toDateTimeLocalInput(record.scheduledAt),
    osNumber: record.osNumber,
    serviceType: record.serviceType,
    status: record.status,
    dayTsts: record.dayTsts.map((item) => ({ ...item })),
    nightTsts: record.nightTsts.map((item) => ({ ...item })),
    cboSupports: record.cboSupports.map((item) => ({ ...item })),
    programs: record.programs.map((item) => ({ ...item })),
  };
}

function formatDateTime(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function statusClass(status: ScheduleStatus) {
  return `schedule-status-${normalizeText(status).replace(/\s+/g, "-")}`;
}

function scheduleSnapshot(record: ScheduleRecord) {
  return {
    vessel: record.vessel,
    scheduledAt: record.scheduledAt,
    osNumber: record.osNumber,
    serviceType: record.serviceType,
    status: record.status,
    dayTsts: record.dayTsts.map((item) => ({ ...item })),
    nightTsts: record.nightTsts.map((item) => ({ ...item })),
    cboSupports: record.cboSupports.map((item) => ({ ...item })),
    programs: record.programs.map((item) => ({ ...item })),
  };
}

function listNames(list: ScheduleContact[]) {
  return list.map((person) => person.name).filter(Boolean).join(", ") || "nenhum";
}

function peopleSignature(list: ScheduleContact[]) {
  return list.map((person) => `${person.name}|${person.contact}`).sort().join(";");
}

function programsSignature(list: ScheduleProgramTurn[]) {
  return list.map((program) => `${program.shift}|${program.timeRange}`).sort().join(";");
}

function summarizePeopleChange(label: string, before: ScheduleContact[], after: ScheduleContact[]) {
  if (peopleSignature(before) === peopleSignature(after)) return "";
  return `${label}: antes ${listNames(before)}; depois ${listNames(after)}.`;
}

function summarizeScheduleChanges(before: ScheduleRecord, after: ScheduleRecord) {
  const changes = [
    before.osNumber !== after.osNumber ? `OS alterada de ${before.osNumber} para ${after.osNumber}.` : "",
    before.vessel !== after.vessel ? `Embarcação alterada de ${before.vessel} para ${after.vessel}.` : "",
    before.scheduledAt !== after.scheduledAt ? `Data alterada de ${formatDateTime(before.scheduledAt)} para ${formatDateTime(after.scheduledAt)}.` : "",
    before.serviceType !== after.serviceType ? `Tipo alterado de ${before.serviceType} para ${after.serviceType}.` : "",
    before.status !== after.status ? `Status alterado de ${before.status} para ${after.status}.` : "",
    summarizePeopleChange("TSTs diurnos", before.dayTsts, after.dayTsts),
    summarizePeopleChange("TSTs noturnos", before.nightTsts, after.nightTsts),
    summarizePeopleChange("Suporte CBO", before.cboSupports, after.cboSupports),
    programsSignature(before.programs) !== programsSignature(after.programs) ? "Programação de atendimento alterada." : "",
  ].filter(Boolean);
  return changes.join(" ") || "Registro salvo sem diferença detectável nos campos principais.";
}

function createScheduleLog(
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

function validContacts(list: ScheduleContact[]) {
  return list
    .map((contact) => ({ ...contact, name: contact.name.trim(), contact: contact.contact.trim() }))
    .filter((contact) => contact.name || contact.contact);
}

function validateDraft(draft: ScheduleDraft) {
  const dayTsts = validContacts(draft.dayTsts);
  const nightTsts = validContacts(draft.nightTsts);
  const cboSupports = validContacts(draft.cboSupports);
  const programs = draft.programs.filter((program) => program.timeRange.trim());

  if (!draft.vessel || !draft.scheduledAt || !draft.osNumber.trim() || !programs.length) {
    return "Preencha embarcação, data/hora, número da OS e programação de atendimento.";
  }
  if (!dayTsts.length && !nightTsts.length) {
    return "Informe pelo menos um TST diurno ou noturno.";
  }
  const invalidContact = [...dayTsts, ...nightTsts, ...cboSupports]
    .find((contact) => !contact.name || !phonePattern.test(contact.contact));
  if (invalidContact) {
    return "Todos os envolvidos precisam de nome completo e contato no formato (21) 99999-9999.";
  }
  return "";
}

export function Schedule({ user, settings, records, onCreate, onUpdate, onArchive, onDelete, onStatusChange }: ScheduleProps) {
  const canManage = user.role === "admin" || user.role === "supervisor";
  const canCreate = canManage || user.role === "colaborador";
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [filters, setFilters] = useState<ScheduleFilters>({
    status: "Todos",
    vessel: "Todas",
    serviceType: "Todos",
    from: "",
    to: "",
  });
  const [draft, setDraft] = useState<ScheduleDraft>(() => emptyDraft(settings.vessels));
  const [editingRecord, setEditingRecord] = useState<ScheduleRecord | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ScheduleRecord | null>(null);
  const [editObservation, setEditObservation] = useState("");
  const [pendingStatus, setPendingStatus] = useState<{ record: ScheduleRecord; status: ScheduleStatus; observation: string } | null>(null);
  const [pendingArchive, setPendingArchive] = useState<{ record: ScheduleRecord; archived: boolean; observation: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ScheduleRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredRecords = useMemo(() => {
    const term = normalizeText(query.trim());
    return records.filter((record) => {
      if (!!record.archived !== showArchived) return false;
      if (filters.status !== "Todos" && record.status !== filters.status) return false;
      if (filters.vessel !== "Todas" && record.vessel !== filters.vessel) return false;
      if (filters.serviceType !== "Todos" && record.serviceType !== filters.serviceType) return false;
      if (filters.from && record.scheduledAt.slice(0, 10) < filters.from) return false;
      if (filters.to && record.scheduledAt.slice(0, 10) > filters.to) return false;
      if (!term) return true;
      const searchable = normalizeText([
        record.osNumber,
        record.vessel,
        record.serviceType,
        record.status,
        formatDateTime(record.scheduledAt),
        record.programs.map((program) => `${program.shift} ${program.timeRange}`).join(" "),
        [...record.dayTsts, ...record.nightTsts, ...record.cboSupports].map((person) => `${person.name} ${person.contact}`).join(" "),
        (record.changeHistory ?? []).map((log) => `${log.type} ${log.summary} ${log.observation} ${log.changedBy}`).join(" "),
      ].join(" "));
      return searchable.includes(term);
    });
  }, [filters, query, records, showArchived]);

  const archivedCount = records.filter((record) => record.archived).length;

  const grouped = useMemo(
    () => statuses.map((status) => ({
      status,
      records: filteredRecords
        .filter((record) => record.status === status)
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    })),
    [filteredRecords],
  );

  function openNewSchedule() {
    setDraft(emptyDraft(settings.vessels));
    setEditingRecord(null);
    setSelectedRecord(null);
    setEditObservation("");
    setError("");
    setFormOpen(true);
  }

  function openEditSchedule(record: ScheduleRecord) {
    setDraft(cloneDraft(record));
    setEditingRecord(record);
    setSelectedRecord(null);
    setEditObservation("");
    setError("");
    setFormOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const validation = validateDraft(draft);
    setError(validation);
    if (validation) return;
    if (editingRecord && !editObservation.trim()) {
      setError("Informe a observação/motivo da edição para manter o histórico completo.");
      return;
    }

    const nextDraft = {
      ...draft,
      dayTsts: validContacts(draft.dayTsts),
      nightTsts: validContacts(draft.nightTsts),
      cboSupports: validContacts(draft.cboSupports),
      programs: draft.programs.filter((program) => program.timeRange.trim()),
      osNumber: draft.osNumber.trim(),
    };
    setSaving(true);
    let recordToSave: ScheduleRecord;
    if (editingRecord) {
      recordToSave = { ...editingRecord, ...nextDraft };
      recordToSave = {
        ...recordToSave,
        changeHistory: [
          ...(editingRecord.changeHistory ?? []),
          createScheduleLog(
            "Edição",
            summarizeScheduleChanges(editingRecord, recordToSave),
            editObservation,
            user.name,
            recordToSave,
            editingRecord,
          ),
        ],
      };
    } else {
      recordToSave = {
        id: `AGD-${Date.now()}`,
        ...nextDraft,
        createdAt: new Date().toISOString(),
        createdBy: user.name,
      };
      recordToSave = {
        ...recordToSave,
        changeHistory: [
          createScheduleLog("Criação", "Programação criada.", "Registro inicial da programação.", user.name, recordToSave),
        ],
      };
    }
    const saved = editingRecord ? await onUpdate(recordToSave) : await onCreate(recordToSave);
    setSaving(false);
    if (!saved) {
      setError("Não foi possível salvar a programação.");
      return;
    }
    setFormOpen(false);
    setEditingRecord(null);
    setEditObservation("");
    setDraft(emptyDraft(settings.vessels));
  }

  return (
    <>
      <section className="page-heading heading-with-action schedule-heading">
        <div>
          <span className="eyebrow">PROGRAMAÇÃO</span>
          <h1>Agendamento de Programação</h1>
          <p>Acompanhe os agendamentos no Kanban e pesquise pelo item desejado.</p>
        </div>
        <div className="schedule-heading-actions">
          <button className={`button ${showArchived ? "button-primary" : "button-secondary"}`} onClick={() => setShowArchived((current) => !current)}>
            {showArchived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
            {showArchived ? "Ver ativos" : `Arquivados (${archivedCount})`}
          </button>
          {canCreate && <button className="button button-primary" onClick={openNewSchedule}><Plus size={18} /> Nova Programação</button>}
        </div>
      </section>

      <section className="panel schedule-filter-panel">
        <label className="search-field">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar OS, embarcação, TST, suporte ou horário" />
        </label>
        <div className="schedule-filter-controls">
          <label><span><SlidersHorizontal size={13} /> Status</span><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as ScheduleFilters["status"] }))}><option>Todos</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
          <label><span>Embarcação</span><select value={filters.vessel} onChange={(event) => setFilters((current) => ({ ...current, vessel: event.target.value }))}><option>Todas</option>{settings.vessels.map((vessel) => <option key={vessel}>{vessel}</option>)}</select></label>
          <label><span>Tipo</span><select value={filters.serviceType} onChange={(event) => setFilters((current) => ({ ...current, serviceType: event.target.value as ScheduleFilters["serviceType"] }))}><option>Todos</option>{serviceTypes.map((serviceType) => <option key={serviceType}>{serviceType}</option>)}</select></label>
          <label><span>De</span><input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} /></label>
          <label><span>Até</span><input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} /></label>
          <button className="button button-secondary schedule-clear-filters" type="button" onClick={() => { setQuery(""); setFilters({ status: "Todos", vessel: "Todas", serviceType: "Todos", from: "", to: "" }); }}>Limpar filtros</button>
        </div>
        <span>{filteredRecords.length} de {records.filter((record) => !!record.archived === showArchived).length} programações {showArchived ? "arquivadas" : "ativas"} exibidas</span>
      </section>

      <section className="schedule-board schedule-board-full">
        {grouped.map((column) => (
          <section className="schedule-column" key={column.status}>
            <header>
              <strong>{column.status}</strong>
              <span>{column.records.length}</span>
            </header>
            <div className="schedule-cards">
              {column.records.map((record) => (
                <ScheduleCard
                  key={record.id}
                  record={record}
                  canManage={canManage}
                  onOpen={() => setSelectedRecord(record)}
                  onArchive={() => setPendingArchive({ record, archived: !record.archived, observation: "" })}
                  onDelete={() => setPendingDelete(record)}
                  onStatusChange={(nextStatus) => {
                    if (nextStatus !== record.status) {
                      setPendingStatus({ record, status: nextStatus, observation: "" });
                    }
                  }}
                />
              ))}
              {!column.records.length && <div className="schedule-empty">Nenhum agendamento.</div>}
            </div>
          </section>
        ))}
      </section>

      {selectedRecord && (
        <ScheduleDetailsModal
          record={selectedRecord}
          canManage={canManage}
          onClose={() => setSelectedRecord(null)}
          onEdit={() => openEditSchedule(selectedRecord)}
          onArchive={() => setPendingArchive({ record: selectedRecord, archived: !selectedRecord.archived, observation: "" })}
          onDelete={() => setPendingDelete(selectedRecord)}
        />
      )}

      {formOpen && (
        <ScheduleFormModal
          draft={draft}
          settings={settings}
          error={error}
          saving={saving}
          editing={!!editingRecord}
          observation={editObservation}
          onDraftChange={setDraft}
          onObservationChange={setEditObservation}
          onClose={() => setFormOpen(false)}
          onSubmit={submit}
        />
      )}

      {pendingStatus && (
        <StatusObservationModal
          pending={pendingStatus}
          saving={saving}
          onChange={(observation) => setPendingStatus((current) => current ? { ...current, observation } : current)}
          onClose={() => setPendingStatus(null)}
          onConfirm={async () => {
            if (!pendingStatus.observation.trim()) return;
            setSaving(true);
            const saved = await onStatusChange(pendingStatus.record.id, pendingStatus.status, pendingStatus.observation);
            setSaving(false);
            if (saved) setPendingStatus(null);
          }}
        />
      )}

      {pendingArchive && (
        <ArchiveObservationModal
          pending={pendingArchive}
          saving={saving}
          onChange={(observation) => setPendingArchive((current) => current ? { ...current, observation } : current)}
          onClose={() => setPendingArchive(null)}
          onConfirm={async () => {
            if (!pendingArchive.observation.trim()) return;
            setSaving(true);
            const saved = await onArchive(pendingArchive.record.id, pendingArchive.archived, pendingArchive.observation);
            setSaving(false);
            if (saved) {
              setPendingArchive(null);
              setSelectedRecord(null);
            }
          }}
        />
      )}

      {pendingDelete && (
        <DeleteScheduleModal
          record={pendingDelete}
          saving={saving}
          onClose={() => setPendingDelete(null)}
          onConfirm={async () => {
            setSaving(true);
            const deleted = await onDelete(pendingDelete.id);
            setSaving(false);
            if (deleted) {
              setPendingDelete(null);
              setSelectedRecord(null);
            }
          }}
        />
      )}
    </>
  );
}

function ScheduleCard({
  record,
  canManage,
  onOpen,
  onArchive,
  onDelete,
  onStatusChange,
}: {
  record: ScheduleRecord;
  canManage: boolean;
  onOpen: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onStatusChange: (status: ScheduleStatus) => void;
}) {
  return (
    <article className="schedule-card compact-schedule-card" onClick={onOpen}>
      <div className="schedule-card-top">
        <span className={`schedule-status ${statusClass(record.status)}`}>{record.archived ? "Arquivado" : record.status}</span>
        <button className="row-action" type="button" onClick={(event) => { event.stopPropagation(); onOpen(); }}><Eye size={13} /> Abrir</button>
      </div>
      <h3>{record.osNumber}</h3>
      <dl>
        <div><dt><Ship size={13} /> Embarcação</dt><dd>{record.vessel}</dd></div>
        <div><dt><CalendarClock size={13} /> Data da solicitação</dt><dd>{formatDateTime(record.scheduledAt)}</dd></div>
        <div><dt><Clock size={13} /> Programação</dt><dd>{record.programs.map((program) => `${program.shift}: ${program.timeRange}`).join(" / ")}</dd></div>
      </dl>
      {canManage && (
        <div className="schedule-card-actions" onClick={(event) => event.stopPropagation()}>
          {!record.archived && (
            <label className="schedule-status-select">
              <span>Status</span>
              <select value={record.status} onChange={(event) => onStatusChange(event.target.value as ScheduleStatus)}>
                {statuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
          )}
          <div className="schedule-action-row">
            <button className="row-action" type="button" onClick={onArchive}>{record.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />} {record.archived ? "Restaurar" : "Arquivar"}</button>
            <button className="row-action admin-delete-action" type="button" onClick={onDelete}><Trash2 size={13} /> Excluir</button>
          </div>
        </div>
      )}
    </article>
  );
}

function ScheduleDetailsModal({
  record,
  canManage,
  onClose,
  onEdit,
  onArchive,
  onDelete,
}: {
  record: ScheduleRecord;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <section className="modal schedule-detail-modal">
        <div className="modal-header">
          <div>
            <span className="eyebrow">DETALHES DA PROGRAMAÇÃO</span>
            <h2>{record.osNumber}</h2>
          </div>
          <button className="icon-button" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="schedule-detail-grid">
          <DetailItem icon={Ship} label="Embarcação" value={record.vessel} />
          <DetailItem icon={CalendarClock} label="Data da solicitação" value={formatDateTime(record.scheduledAt)} />
          <DetailItem icon={CheckCircle2} label="Tipo de atendimento" value={record.serviceType} />
          <DetailItem icon={Clock} label="Programação" value={record.programs.map((program) => `${program.shift}: ${program.timeRange}`).join(" / ")} />
        </div>
        <div className="schedule-people-grid">
          <PeopleBlock title="TSTs diurnos" people={record.dayTsts} tone="day" />
          <PeopleBlock title="TSTs noturnos" people={record.nightTsts} tone="night" />
          <PeopleBlock title="Suporte da CBO" people={record.cboSupports} tone="support" />
        </div>
        <ScheduleHistory history={record.changeHistory ?? []} />
        <div className="form-actions">
          {canManage && !record.archived && <button className="button button-primary" onClick={onEdit}><Pencil size={17} /> Editar</button>}
          {canManage && <button className="button button-secondary" onClick={onArchive}>{record.archived ? <ArchiveRestore size={17} /> : <Archive size={17} />} {record.archived ? "Restaurar" : "Arquivar"}</button>}
          {canManage && <button className="button button-danger" onClick={onDelete}><Trash2 size={17} /> Excluir</button>}
          <button className="button button-secondary" onClick={onClose}>Fechar</button>
        </div>
      </section>
    </div>
  );
}

function StatusObservationModal({
  pending,
  saving,
  onChange,
  onClose,
  onConfirm,
}: {
  pending: { record: ScheduleRecord; status: ScheduleStatus; observation: string };
  saving: boolean;
  onChange: (observation: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <section className="modal schedule-status-modal">
        <div className="modal-header">
          <div>
            <span className="eyebrow">MUDANÇA DE STATUS</span>
            <h2>{pending.record.osNumber}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose}><X size={20} /></button>
        </div>
        <p>Informe o motivo para alterar de <strong>{pending.record.status}</strong> para <strong>{pending.status}</strong>. Esta observação ficará gravada no histórico.</p>
        <label className="field schedule-observation-field">
          <span>Observação</span>
          <textarea value={pending.observation} onChange={(event) => onChange(event.target.value)} placeholder="Ex.: troca solicitada pela operação, programação cancelada, atendimento iniciado..." />
        </label>
        <div className="form-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>Cancelar</button>
          <button className="button button-primary" type="button" disabled={saving || !pending.observation.trim()} onClick={onConfirm}>{saving ? "Salvando..." : "Confirmar mudança"}</button>
        </div>
      </section>
    </div>
  );
}

function ArchiveObservationModal({
  pending,
  saving,
  onChange,
  onClose,
  onConfirm,
}: {
  pending: { record: ScheduleRecord; archived: boolean; observation: string };
  saving: boolean;
  onChange: (observation: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <section className="modal schedule-status-modal">
        <div className="modal-header">
          <div>
            <span className="eyebrow">{pending.archived ? "ARQUIVAR" : "RESTAURAR"}</span>
            <h2>{pending.record.osNumber}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose}><X size={20} /></button>
        </div>
        <p>Informe o motivo para {pending.archived ? "arquivar" : "restaurar"} esta programação. Esta observação ficará gravada no histórico.</p>
        <label className="field schedule-observation-field">
          <span>Observação</span>
          <textarea value={pending.observation} onChange={(event) => onChange(event.target.value)} placeholder="Explique o motivo desta ação." />
        </label>
        <div className="form-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>Cancelar</button>
          <button className="button button-primary" type="button" disabled={saving || !pending.observation.trim()} onClick={onConfirm}>{saving ? "Salvando..." : "Confirmar"}</button>
        </div>
      </section>
    </div>
  );
}

function DeleteScheduleModal({
  record,
  saving,
  onClose,
  onConfirm,
}: {
  record: ScheduleRecord;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <section className="modal delete-record-modal">
        <div className="delete-record-icon"><Trash2 size={24} /></div>
        <h2>Excluir programação?</h2>
        <p>Esta ação remove definitivamente o card <strong>{record.osNumber}</strong>. Para manter histórico, prefira arquivar.</p>
        <div className="form-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>Cancelar</button>
          <button className="button button-danger" type="button" disabled={saving} onClick={onConfirm}>{saving ? "Excluindo..." : "Excluir definitivamente"}</button>
        </div>
      </section>
    </div>
  );
}

function ScheduleHistory({ history }: { history: ScheduleChangeLog[] }) {
  const ordered = [...history].sort((a, b) => b.changedAt.localeCompare(a.changedAt));
  return (
    <section className="schedule-history">
      <h3><History size={16} /> Histórico de mudanças</h3>
      {ordered.length ? ordered.map((log) => (
        <article key={log.id}>
          <header>
            <strong>{log.type}</strong>
            <span>{formatDateTime(log.changedAt)} por {log.changedBy}</span>
          </header>
          <p>{log.summary}</p>
          <blockquote><MessageSquare size={14} /> {log.observation || "Sem observação informada."}</blockquote>
        </article>
      )) : <div className="schedule-empty">Nenhuma mudança registrada até agora.</div>}
    </section>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: typeof Ship; label: string; value: string }) {
  return <div className="schedule-detail-item"><Icon size={15} /><span>{label}</span><strong>{value || "Não informado"}</strong></div>;
}

function PeopleBlock({ title, people, tone }: { title: string; people: ScheduleContact[]; tone: "day" | "night" | "support" }) {
  return (
    <section className={`schedule-people-block ${tone}`}>
      <h3>{title}</h3>
      {people.length ? people.map((person) => (
        <div key={person.id}>
          <UserRound size={15} />
          <span><strong>{person.name}</strong><small><Phone size={12} /> {person.contact}</small></span>
        </div>
      )) : <p>Nenhum envolvido informado.</p>}
    </section>
  );
}

function ScheduleFormModal({
  draft,
  settings,
  error,
  saving,
  editing,
  observation,
  onDraftChange,
  onObservationChange,
  onClose,
  onSubmit,
}: {
  draft: ScheduleDraft;
  settings: SystemSettings;
  error: string;
  saving: boolean;
  editing: boolean;
  observation: string;
  onDraftChange: (draft: ScheduleDraft) => void;
  onObservationChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  function patchDraft(patch: Partial<ScheduleDraft>) {
    onDraftChange({ ...draft, ...patch });
  }

  function updateContact(key: "dayTsts" | "nightTsts" | "cboSupports", id: string, patch: Partial<ScheduleContact>) {
    patchDraft({
      [key]: draft[key].map((contact) => (contact.id === id ? { ...contact, ...patch } : contact)),
    });
  }

  function removeContact(key: "dayTsts" | "nightTsts" | "cboSupports", id: string) {
    const list = draft[key];
    patchDraft({
      [key]: list.length === 1 ? [{ ...list[0], name: "", contact: "" }] : list.filter((contact) => contact.id !== id),
    });
  }

  function addContact(key: "dayTsts" | "nightTsts" | "cboSupports", prefix: string) {
    patchDraft({ [key]: [...draft[key], emptyContact(prefix)] });
  }

  function toggleProgram(shift: "Diurno" | "Noturno") {
    patchDraft({
      programs: draft.programs.some((program) => program.shift === shift)
        ? draft.programs.filter((program) => program.shift !== shift)
        : [...draft.programs, defaultProgram(shift)],
    });
  }

  return (
    <div className="modal-backdrop">
      <form className="modal schedule-form-modal" onSubmit={onSubmit}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">{editing ? "EDIÇÃO" : "NOVA PROGRAMAÇÃO"}</span>
            <h2>{editing ? "Editar programação" : "Nova Programação"}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose}><X size={20} /></button>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <div className="schedule-form-body">
          <div className="form-grid">
            <label className="field"><span>Embarcação</span><select value={draft.vessel} onChange={(event) => patchDraft({ vessel: event.target.value })}>{settings.vessels.map((name) => <option key={name}>{name}</option>)}</select></label>
            <label className="field"><span>Data e hora</span><input type="datetime-local" value={draft.scheduledAt} onChange={(event) => patchDraft({ scheduledAt: event.target.value })} /></label>
            <label className="field"><span>Número da OS</span><input value={draft.osNumber} onChange={(event) => patchDraft({ osNumber: event.target.value })} placeholder="Código da empresa cliente" /></label>
            <label className="field"><span>Tipo de atendimento</span><select value={draft.serviceType} onChange={(event) => patchDraft({ serviceType: event.target.value as ScheduleServiceType })}>{serviceTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
            {editing && <label className="field"><span>Status</span><select value={draft.status} onChange={(event) => patchDraft({ status: event.target.value as ScheduleStatus })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>}
          </div>
          <ContactGroup title="TSTs diurnos" options={settings.technicians} contacts={draft.dayTsts} onAdd={() => addContact("dayTsts", "day")} onRemove={(id) => removeContact("dayTsts", id)} onChange={(id, patch) => updateContact("dayTsts", id, patch)} />
          <ContactGroup title="TSTs noturnos" options={settings.technicians} contacts={draft.nightTsts} onAdd={() => addContact("nightTsts", "night")} onRemove={(id) => removeContact("nightTsts", id)} onChange={(id, patch) => updateContact("nightTsts", id, patch)} />
          <ContactGroup title="Suporte da CBO" contacts={draft.cboSupports} onAdd={() => addContact("cboSupports", "cbo")} onRemove={(id) => removeContact("cboSupports", id)} onChange={(id, patch) => updateContact("cboSupports", id, patch)} />
          {editing && (
            <label className="field schedule-observation-field">
              <span>Observação da mudança</span>
              <textarea value={observation} onChange={(event) => onObservationChange(event.target.value)} placeholder="Explique se houve edição, exclusão ou troca de TST e o motivo da alteração." />
            </label>
          )}
          <div className="schedule-program-card">
            <strong>Programação de atendimento</strong>
            {(["Diurno", "Noturno"] as const).map((shift) => {
              const program = draft.programs.find((item) => item.shift === shift);
              return (
                <div className="program-row" key={shift}>
                  <label><input type="checkbox" checked={!!program} onChange={() => toggleProgram(shift)} /> {shift}</label>
                  <input
                    disabled={!program}
                    value={program?.timeRange ?? ""}
                    onChange={(event) => patchDraft({ programs: draft.programs.map((item) => item.shift === shift ? { ...item, timeRange: event.target.value } : item) })}
                    placeholder={shift === "Diurno" ? "07:00-19:00HRS" : "19:00-07:00HRS"}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="form-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>Cancelar</button>
          <button className="button button-primary" disabled={saving} type="submit">{saving ? "Salvando..." : "Salvar programação"}</button>
        </div>
      </form>
    </div>
  );
}

function ContactGroup({
  title,
  options,
  contacts,
  onAdd,
  onRemove,
  onChange,
}: {
  title: string;
  options?: string[];
  contacts: ScheduleContact[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, patch: Partial<ScheduleContact>) => void;
}) {
  return (
    <div className="schedule-contact-group">
      <div><strong>{title}</strong><button type="button" className="text-link" onClick={onAdd}><Plus size={14} /> Adicionar</button></div>
      {contacts.map((contact) => (
        <div className="schedule-contact-row" key={contact.id}>
          {options ? (
            <select value={contact.name} onChange={(event) => onChange(contact.id, { name: event.target.value })}>
              <option value="">Nome completo</option>
              {options.map((name) => <option key={name}>{name}</option>)}
            </select>
          ) : (
            <input value={contact.name} onChange={(event) => onChange(contact.id, { name: event.target.value })} placeholder="Nome completo" />
          )}
          <input value={contact.contact} onChange={(event) => onChange(contact.id, { contact: normalizePhone(event.target.value) })} placeholder="(21) 99999-9999" />
          <button type="button" onClick={() => onRemove(contact.id)} aria-label={`Remover ${contact.name || title}`}><Trash2 size={15} /></button>
        </div>
      ))}
    </div>
  );
}
