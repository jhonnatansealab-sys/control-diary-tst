import { Download, FilePenLine, Filter, Search, Ship, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { VesselSelect } from "../components/VesselSelect";
import type {
  Activity,
  AuthUser,
  DiaryRecord,
  EditRequest,
  Shift,
  SystemSettings,
  TurnEntry,
} from "../types";

interface RecordsProps {
  user: AuthUser;
  records: DiaryRecord[];
  settings: SystemSettings;
  onRequest: (request: EditRequest) => void;
}

export function Records({ user, records, settings, onRequest }: RecordsProps) {
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [shift, setShift] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selected, setSelected] = useState<DiaryRecord | null>(null);
  const [exportError, setExportError] = useState("");

  const filtered = useMemo(() => {
    return records.filter((record) => {
      const allowed = user.role !== "colaborador" || record.technician === user.name;
      const matchesQuery = `${record.technician} ${record.turns.flatMap((turn) => turn.vessels).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesShift = !shift || record.turns.some((turn) => turn.shift === shift);
      const afterStart = !startDate || record.date >= startDate;
      const beforeEnd = !endDate || record.date <= endDate;
      return allowed && matchesQuery && matchesShift && afterStart && beforeEnd;
    });
  }, [endDate, query, records, shift, startDate, user]);

  async function exportExcel() {
    if (!startDate || !endDate) {
      setExportError("Informe a data inicial e a data final para exportar.");
      return;
    }
    if (startDate > endDate) {
      setExportError("A data inicial nao pode ser posterior a data final.");
      return;
    }
    setExportError("");
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Atividades TST");
    sheet.columns = [
      { header: "Data", key: "date", width: 14 },
      { header: "Técnico", key: "technician", width: 35 },
      { header: "Turno", key: "shift", width: 14 },
      { header: "Atividade", key: "activity", width: 20 },
      { header: "Embarcação", key: "vessel", width: 25 },
      { header: "Dobra", key: "double", width: 12 },
      { header: "Observações", key: "notes", width: 45 },
      { header: "Status", key: "status", width: 22 },
    ];
    filtered.forEach((record) => {
      record.turns.forEach((turn) => {
        sheet.addRow({
          date: new Date(`${record.date}T12:00:00`),
          technician: record.technician,
          shift: turn.shift,
          activity: turn.activity,
          vessel: turn.vessels[0] ?? "",
          double: record.turns.length === 2 ? "Sim" : "Não",
          notes: record.notes,
          status: record.status,
        });
      });
    });
    sheet.getColumn("date").numFmt = "dd/mm/yyyy";
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF123B5D" } };
    sheet.autoFilter = { from: "A1", to: "H1" };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-tst-${startDate}-a-${endDate}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="page-heading heading-with-action">
        <div>
          <span className="eyebrow">HISTORICO</span>
          <h1>Registros de diárias</h1>
          <p>
            {user.role === "financeiro"
              ? "Filtre o período necessário e exporte todas as atividades realizadas."
              : "Consulte jornadas e solicite correções quando necessário."}
          </p>
        </div>
        {user.role === "financeiro" && (
          <button className="button button-primary" onClick={exportExcel}>
            <Download size={18} /> Exportar Excel
          </button>
        )}
      </section>
      {location.state?.saved && <div className="success-banner">Diária registrada com sucesso.</div>}
      {exportError && <div className="error-banner">{exportError}</div>}
      <section className="panel">
        <div className="filter-bar records-filters">
          <label className="search-field">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar técnico ou embarcação..." />
          </label>
          <label className="date-filter"><span>De</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label className="date-filter"><span>Até</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
          <label className="filter-select">
            <Filter size={17} />
            <select value={shift} onChange={(event) => setShift(event.target.value)}>
              <option value="">Todos os turnos</option><option>Diurno</option><option>Noturno</option>
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Técnico</th><th>Atividade por turno</th><th>Embarcação por turno</th><th>Status</th><th /></tr></thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.id}>
                  <td>{new Intl.DateTimeFormat("pt-BR").format(new Date(`${record.date}T12:00:00`))}</td>
                  <td><strong>{record.technician}</strong><small>{record.id}</small></td>
                  <td>{record.turns.map((turn) => <span className="journey-line" key={turn.shift}><b>{turn.shift}</b> · {turn.activity}</span>)}</td>
                  <td>
                    <div className="turn-vessels">
                      {record.turns.map((turn) => (
                        <span key={turn.shift}><Ship size={14} /><b>{turn.shift}</b><em>{turn.vessels[0]}</em></span>
                      ))}
                    </div>
                  </td>
                  <td><StatusBadge status={record.status} /></td>
                  <td>
                    {user.role === "colaborador" && (
                      <button className="row-action edit-request-button" onClick={() => setSelected(record)}>
                        <FilePenLine size={18} /> Solicitar edição
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {selected && (
        <EditRecordModal
          record={selected}
          vessels={settings.vessels}
          onClose={() => setSelected(null)}
          onSubmit={(request) => { onRequest(request); setSelected(null); }}
        />
      )}
    </>
  );
}

interface EditRecordModalProps {
  record: DiaryRecord;
  vessels: string[];
  onClose: () => void;
  onSubmit: (request: EditRequest) => void;
}

function EditRecordModal({ record, vessels, onClose, onSubmit }: EditRecordModalProps) {
  const [draft, setDraft] = useState<DiaryRecord>(() => structuredClone(record));
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function updateTurn(index: number, patch: Partial<TurnEntry>) {
    setDraft((current) => ({
      ...current,
      turns: current.turns.map((turn, turnIndex) => {
        if (turnIndex === index) return { ...turn, ...patch };
        if (index === 0 && turnIndex === 1 && patch.shift) {
          return { ...turn, shift: patch.shift === "Diurno" ? "Noturno" : "Diurno" };
        }
        return turn;
      }),
    }));
  }

  function toggleDouble() {
    setDraft((current) => ({
      ...current,
      turns: current.turns.length === 2
        ? [current.turns[0]]
        : [...current.turns, {
            shift: current.turns[0].shift === "Diurno" ? "Noturno" : "Diurno",
            activity: "Area",
            vessels: [],
          }],
    }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!reason.trim() || draft.turns.some((turn) => !turn.vessels.length)) {
      setError("Preencha o motivo e selecione uma embarcação para cada turno.");
      return;
    }
    onSubmit({
      id: `SOL-${Date.now().toString().slice(-6)}`,
      recordId: record.id,
      technician: record.technician,
      date: record.date,
      reason: reason.trim(),
      originalRecord: structuredClone(record),
      proposedRecord: { ...draft, status: "Solicitacao enviada" },
      status: "Pendente",
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <div className="modal-backdrop">
      <form className="modal edit-record-modal" onSubmit={submit}>
        <div className="modal-header">
          <div><span className="eyebrow">REGISTRO {record.id}</span><h2>Editar e solicitar correção</h2></div>
          <button type="button" className="icon-button" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="form-grid two-columns">
          <label className="field"><span>Data</span><input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
          <label className="field"><span>Técnico</span><input value={draft.technician} disabled /></label>
        </div>
        {draft.turns.map((turn, index) => (
          <section className="edit-turn-card" key={index}>
            <strong>{index === 0 ? "Primeiro turno" : "Segundo turno"}</strong>
            <div className="form-grid">
              <label className="field"><span>Turno</span><select value={turn.shift} onChange={(event) => updateTurn(index, { shift: event.target.value as Shift })} disabled={index === 1}><option>Diurno</option><option>Noturno</option></select></label>
              <label className="field"><span>Atividade</span><select value={turn.activity} onChange={(event) => updateTurn(index, { activity: event.target.value as Activity })}><option value="Area">Operacional / Área</option><option value="ADM">Administrativa</option></select></label>
              <label className="field full-width"><span>Embarcação</span><VesselSelect id={`edit-vessel-${index}`} value={turn.vessels} onChange={(value) => updateTurn(index, { vessels: value })} options={vessels} single /></label>
            </div>
          </section>
        ))}
        <button type="button" className="button button-secondary double-edit-button" onClick={toggleDouble}>
          {draft.turns.length === 2 ? "Remover dobra" : "Adicionar dobra"}
        </button>
        <label className="field"><span>Observações</span><textarea rows={3} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
        <label className="field"><span>Motivo da mudança <b>*</b></span><textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} required /></label>
        {error && <div className="error-banner">{error}</div>}
        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>Cancelar</button>
          <button className="button button-primary"><FilePenLine size={17} /> Solicitar edição</button>
        </div>
      </form>
    </div>
  );
}
