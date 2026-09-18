import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Phone,
  Plus,
  Ship,
  Trash2,
  UserRound,
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
  onStatusChange: (id: string, status: ScheduleStatus) => Promise<boolean>;
}

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

function defaultProgram(shift: "Diurno" | "Noturno"): ScheduleProgramTurn {
  return {
    shift,
    timeRange: shift === "Diurno" ? "07:00-19:00HRS" : "19:00-07:00HRS",
  };
}

export function Schedule({ user, settings, records, onCreate, onStatusChange }: ScheduleProps) {
  const canManage = user.role === "admin" || user.role === "supervisor";
  const [vessel, setVessel] = useState(settings.vessels[0] ?? "");
  const [scheduledAt, setScheduledAt] = useState("");
  const [osNumber, setOsNumber] = useState("");
  const [serviceType, setServiceType] = useState<ScheduleServiceType>("Operacional");
  const [dayTsts, setDayTsts] = useState<ScheduleContact[]>([emptyContact("day")]);
  const [nightTsts, setNightTsts] = useState<ScheduleContact[]>([emptyContact("night")]);
  const [cboSupports, setCboSupports] = useState<ScheduleContact[]>([emptyContact("cbo")]);
  const [programs, setPrograms] = useState<ScheduleProgramTurn[]>([
    defaultProgram("Diurno"),
    defaultProgram("Noturno"),
  ]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const grouped = useMemo(
    () => statuses.map((status) => ({
      status,
      records: records
        .filter((record) => record.status === status)
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    })),
    [records],
  );

  function updateContact(
    list: ScheduleContact[],
    setter: (value: ScheduleContact[]) => void,
    id: string,
    patch: Partial<ScheduleContact>,
  ) {
    setter(list.map((contact) => (contact.id === id ? { ...contact, ...patch } : contact)));
  }

  function removeContact(
    list: ScheduleContact[],
    setter: (value: ScheduleContact[]) => void,
    id: string,
  ) {
    setter(list.length === 1 ? [{ ...list[0], name: "", contact: "" }] : list.filter((contact) => contact.id !== id));
  }

  function validContacts(list: ScheduleContact[]) {
    return list
      .map((contact) => ({ ...contact, name: contact.name.trim(), contact: contact.contact.trim() }))
      .filter((contact) => contact.name || contact.contact);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const nextDayTsts = validContacts(dayTsts);
    const nextNightTsts = validContacts(nightTsts);
    const nextCboSupports = validContacts(cboSupports);
    const nextPrograms = programs.filter((program) => program.timeRange.trim());

    if (!vessel || !scheduledAt || !osNumber.trim() || !nextPrograms.length) {
      setError("Preencha embarcação, data/hora, número da OS e programação de atendimento.");
      return;
    }
    if (!nextDayTsts.length && !nextNightTsts.length) {
      setError("Informe pelo menos um TST diurno ou noturno.");
      return;
    }
    const invalidContact = [...nextDayTsts, ...nextNightTsts, ...nextCboSupports]
      .find((contact) => !contact.name || !phonePattern.test(contact.contact));
    if (invalidContact) {
      setError("Todos os envolvidos precisam de nome completo e contato no formato (21) 99999-9999.");
      return;
    }

    setSaving(true);
    const record: ScheduleRecord = {
      id: `AGD-${Date.now()}`,
      vessel,
      scheduledAt,
      osNumber: osNumber.trim(),
      serviceType,
      status: "Programado",
      dayTsts: nextDayTsts,
      nightTsts: nextNightTsts,
      cboSupports: nextCboSupports,
      programs: nextPrograms,
      createdAt: new Date().toISOString(),
      createdBy: user.name,
    };
    const saved = await onCreate(record);
    setSaving(false);
    if (!saved) {
      setError("Não foi possível salvar o agendamento.");
      return;
    }
    setScheduledAt("");
    setOsNumber("");
    setServiceType("Operacional");
    setDayTsts([emptyContact("day")]);
    setNightTsts([emptyContact("night")]);
    setCboSupports([emptyContact("cbo")]);
    setPrograms([defaultProgram("Diurno"), defaultProgram("Noturno")]);
  }

  function toggleProgram(shift: "Diurno" | "Noturno") {
    setPrograms((current) =>
      current.some((program) => program.shift === shift)
        ? current.filter((program) => program.shift !== shift)
        : [...current, defaultProgram(shift)],
    );
  }

  return (
    <>
      <section className="page-heading heading-with-action schedule-heading">
        <div>
          <span className="eyebrow">PROGRAMAÇÃO</span>
          <h1>Agendamento de Programação</h1>
          <p>Cadastre atendimentos por embarcação e acompanhe o andamento em Kanban.</p>
        </div>
      </section>

      <section className="schedule-layout">
        {canManage && (
          <form className="panel schedule-form-panel" onSubmit={submit}>
            <div className="panel-header">
              <div><h2>Novo agendamento</h2><p>Dados obrigatórios para a programação de atendimento.</p></div>
            </div>
            {error && <div className="error-banner schedule-error">{error}</div>}
            <div className="schedule-form-body">
              <div className="form-grid">
                <label className="field"><span>Embarcação</span><select value={vessel} onChange={(event) => setVessel(event.target.value)}>{settings.vessels.map((name) => <option key={name}>{name}</option>)}</select></label>
                <label className="field"><span>Data e hora</span><input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label>
                <label className="field"><span>Número da OS</span><input value={osNumber} onChange={(event) => setOsNumber(event.target.value)} placeholder="Código da empresa cliente" /></label>
                <label className="field"><span>Tipo de atendimento</span><select value={serviceType} onChange={(event) => setServiceType(event.target.value as ScheduleServiceType)}>{serviceTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
              </div>

              <ContactGroup
                title="TSTs diurnos"
                options={settings.technicians}
                contacts={dayTsts}
                onAdd={() => setDayTsts((current) => [...current, emptyContact("day")])}
                onRemove={(id) => removeContact(dayTsts, setDayTsts, id)}
                onChange={(id, patch) => updateContact(dayTsts, setDayTsts, id, patch)}
              />
              <ContactGroup
                title="TSTs noturnos"
                options={settings.technicians}
                contacts={nightTsts}
                onAdd={() => setNightTsts((current) => [...current, emptyContact("night")])}
                onRemove={(id) => removeContact(nightTsts, setNightTsts, id)}
                onChange={(id, patch) => updateContact(nightTsts, setNightTsts, id, patch)}
              />
              <ContactGroup
                title="Suporte da CBO"
                contacts={cboSupports}
                onAdd={() => setCboSupports((current) => [...current, emptyContact("cbo")])}
                onRemove={(id) => removeContact(cboSupports, setCboSupports, id)}
                onChange={(id, patch) => updateContact(cboSupports, setCboSupports, id, patch)}
              />

              <div className="schedule-program-card">
                <strong>Programação de atendimento</strong>
                {(["Diurno", "Noturno"] as const).map((shift) => {
                  const program = programs.find((item) => item.shift === shift);
                  return (
                    <div className="program-row" key={shift}>
                      <label><input type="checkbox" checked={!!program} onChange={() => toggleProgram(shift)} /> {shift}</label>
                      <input
                        disabled={!program}
                        value={program?.timeRange ?? ""}
                        onChange={(event) => setPrograms((current) => current.map((item) => item.shift === shift ? { ...item, timeRange: event.target.value } : item))}
                        placeholder={shift === "Diurno" ? "07:00-19:00HRS" : "19:00-07:00HRS"}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="form-actions">
                <button className="button button-primary" disabled={saving} type="submit"><Plus size={17} /> {saving ? "Salvando..." : "Incluir registro"}</button>
              </div>
            </div>
          </form>
        )}

        <div className="schedule-board">
          {grouped.map((column) => (
            <section className="schedule-column" key={column.status}>
              <header>
                <strong>{column.status}</strong>
                <span>{column.records.length}</span>
              </header>
              <div className="schedule-cards">
                {column.records.map((record) => (
                  <ScheduleCard key={record.id} record={record} canManage={canManage} onStatusChange={onStatusChange} />
                ))}
                {!column.records.length && <div className="schedule-empty">Nenhum agendamento.</div>}
              </div>
            </section>
          ))}
        </div>
      </section>
    </>
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

function ScheduleCard({
  record,
  canManage,
  onStatusChange,
}: {
  record: ScheduleRecord;
  canManage: boolean;
  onStatusChange: (id: string, status: ScheduleStatus) => Promise<boolean>;
}) {
  const people = [...record.dayTsts, ...record.nightTsts];
  return (
    <article className="schedule-card">
      <div className="schedule-card-top">
        <span className={`schedule-status schedule-status-${record.status.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")}`}>{record.status}</span>
        <small>{record.serviceType}</small>
      </div>
      <h3>{record.osNumber}</h3>
      <dl>
        <div><dt><Ship size={13} /> Embarcação</dt><dd>{record.vessel}</dd></div>
        <div><dt><CalendarClock size={13} /> Data e hora</dt><dd>{formatDateTime(record.scheduledAt)}</dd></div>
        <div><dt><Clock size={13} /> Programação</dt><dd>{record.programs.map((program) => `${program.shift}: ${program.timeRange}`).join(" / ")}</dd></div>
        <div><dt><UserRound size={13} /> TSTs</dt><dd>{people.map((person) => person.name).join(", ") || "Não informado"}</dd></div>
        <div><dt><Phone size={13} /> Contatos</dt><dd>{people.map((person) => `${person.name}: ${person.contact}`).join(" | ") || "Não informado"}</dd></div>
        <div><dt><CheckCircle2 size={13} /> Suporte CBO</dt><dd>{record.cboSupports.map((person) => `${person.name}: ${person.contact}`).join(" | ") || "Não informado"}</dd></div>
      </dl>
      {canManage && (
        <label className="schedule-status-select">
          <span>Status</span>
          <select value={record.status} onChange={(event) => onStatusChange(record.id, event.target.value as ScheduleStatus)}>
            {statuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
      )}
    </article>
  );
}
