import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Eye,
  Pencil,
  Phone,
  Plus,
  Search,
  Ship,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type {
  AuthUser,
  ScheduleContact,
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
  onStatusChange: (id: string, status: ScheduleStatus) => Promise<boolean>;
}

type ScheduleDraft = Omit<ScheduleRecord, "id" | "createdAt" | "createdBy">;

const statuses: ScheduleStatus[] = ["Programado", "Em andamento", "Concluído", "Cancelado"];
const serviceTypes: ScheduleServiceType[] = ["Operacional", "DOC&CON"];
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

export function Schedule({ user, settings, records, onCreate, onUpdate, onStatusChange }: ScheduleProps) {
  const canManage = user.role === "admin" || user.role === "supervisor";
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<ScheduleDraft>(() => emptyDraft(settings.vessels));
  const [editingRecord, setEditingRecord] = useState<ScheduleRecord | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ScheduleRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredRecords = useMemo(() => {
    const term = normalizeText(query.trim());
    if (!term) return records;
    return records.filter((record) => {
      const searchable = normalizeText([
        record.osNumber,
        record.vessel,
        record.serviceType,
        record.status,
        formatDateTime(record.scheduledAt),
        record.programs.map((program) => `${program.shift} ${program.timeRange}`).join(" "),
        [...record.dayTsts, ...record.nightTsts, ...record.cboSupports].map((person) => `${person.name} ${person.contact}`).join(" "),
      ].join(" "));
      return searchable.includes(term);
    });
  }, [query, records]);

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
    setError("");
    setFormOpen(true);
  }

  function openEditSchedule(record: ScheduleRecord) {
    setDraft(cloneDraft(record));
    setEditingRecord(record);
    setSelectedRecord(null);
    setError("");
    setFormOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const validation = validateDraft(draft);
    setError(validation);
    if (validation) return;

    const nextDraft = {
      ...draft,
      dayTsts: validContacts(draft.dayTsts),
      nightTsts: validContacts(draft.nightTsts),
      cboSupports: validContacts(draft.cboSupports),
      programs: draft.programs.filter((program) => program.timeRange.trim()),
      osNumber: draft.osNumber.trim(),
    };
    setSaving(true);
    const saved = editingRecord
      ? await onUpdate({ ...editingRecord, ...nextDraft })
      : await onCreate({
          id: `AGD-${Date.now()}`,
          ...nextDraft,
          createdAt: new Date().toISOString(),
          createdBy: user.name,
        });
    setSaving(false);
    if (!saved) {
      setError("Não foi possível salvar a programação.");
      return;
    }
    setFormOpen(false);
    setEditingRecord(null);
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
        {canManage && <button className="button button-primary" onClick={openNewSchedule}><Plus size={18} /> Nova Programação</button>}
      </section>

      <section className="panel schedule-filter-panel">
        <label className="search-field">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar OS, embarcação, TST, suporte ou horário" />
        </label>
        <span>{filteredRecords.length} de {records.length} programações exibidas</span>
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
                  onStatusChange={onStatusChange}
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
        />
      )}

      {formOpen && (
        <ScheduleFormModal
          draft={draft}
          settings={settings}
          error={error}
          saving={saving}
          editing={!!editingRecord}
          onDraftChange={setDraft}
          onClose={() => setFormOpen(false)}
          onSubmit={submit}
        />
      )}
    </>
  );
}

function ScheduleCard({
  record,
  canManage,
  onOpen,
  onStatusChange,
}: {
  record: ScheduleRecord;
  canManage: boolean;
  onOpen: () => void;
  onStatusChange: (id: string, status: ScheduleStatus) => Promise<boolean>;
}) {
  return (
    <article className="schedule-card compact-schedule-card" onClick={onOpen}>
      <div className="schedule-card-top">
        <span className={`schedule-status ${statusClass(record.status)}`}>{record.status}</span>
        <button className="row-action" type="button" onClick={(event) => { event.stopPropagation(); onOpen(); }}><Eye size={13} /> Abrir</button>
      </div>
      <h3>{record.osNumber}</h3>
      <dl>
        <div><dt><Ship size={13} /> Embarcação</dt><dd>{record.vessel}</dd></div>
        <div><dt><CalendarClock size={13} /> Data da solicitação</dt><dd>{formatDateTime(record.scheduledAt)}</dd></div>
        <div><dt><Clock size={13} /> Programação</dt><dd>{record.programs.map((program) => `${program.shift}: ${program.timeRange}`).join(" / ")}</dd></div>
      </dl>
      {canManage && (
        <label className="schedule-status-select" onClick={(event) => event.stopPropagation()}>
          <span>Status</span>
          <select value={record.status} onChange={(event) => onStatusChange(record.id, event.target.value as ScheduleStatus)}>
            {statuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
      )}
    </article>
  );
}

function ScheduleDetailsModal({
  record,
  canManage,
  onClose,
  onEdit,
}: {
  record: ScheduleRecord;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
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
        <div className="form-actions">
          {canManage && <button className="button button-primary" onClick={onEdit}><Pencil size={17} /> Editar</button>}
          <button className="button button-secondary" onClick={onClose}>Fechar</button>
        </div>
      </section>
    </div>
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
  onDraftChange,
  onClose,
  onSubmit,
}: {
  draft: ScheduleDraft;
  settings: SystemSettings;
  error: string;
  saving: boolean;
  editing: boolean;
  onDraftChange: (draft: ScheduleDraft) => void;
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
