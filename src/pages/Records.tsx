import { FilePenLine, Filter, Search, Ship, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import type { AuthUser, DiaryRecord, EditRequest } from "../types";

interface RecordsProps {
  user: AuthUser;
  records: DiaryRecord[];
  onRequest: (request: EditRequest) => void;
}

export function Records({ user, records, onRequest }: RecordsProps) {
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [shift, setShift] = useState("");
  const [selected, setSelected] = useState<DiaryRecord | null>(null);
  const [reason, setReason] = useState("");
  const [requestedChange, setRequestedChange] = useState("");

  const filtered = useMemo(() => {
    return records.filter((record) => {
      const allowed =
        user.role !== "colaborador" || record.technician === user.name;
      const matchesQuery = `${record.technician} ${record.turns.flatMap((turn) => turn.vessels).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesShift = !shift || record.turns.some((turn) => turn.shift === shift);
      return allowed && matchesQuery && matchesShift;
    });
  }, [query, records, shift, user]);

  function submitRequest(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    onRequest({
      id: `SOL-${Date.now().toString().slice(-6)}`,
      recordId: selected.id,
      technician: selected.technician,
      date: selected.date,
      reason,
      requestedChange,
      status: "Pendente",
      createdAt: new Date().toISOString(),
    });
    setSelected(null);
    setReason("");
    setRequestedChange("");
  }

  return (
    <>
      <section className="page-heading">
        <span className="eyebrow">HISTORICO</span>
        <h1>Registros de diarias</h1>
        <p>Consulte jornadas e solicite correcoes quando necessario.</p>
      </section>
      {location.state?.saved && (
        <div className="success-banner">Diaria registrada com sucesso.</div>
      )}
      <section className="panel">
        <div className="filter-bar">
          <label className="search-field">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar tecnico ou embarcacao..."
            />
          </label>
          <label className="filter-select">
            <Filter size={17} />
            <select value={shift} onChange={(event) => setShift(event.target.value)}>
              <option value="">Todos os turnos</option>
              <option>Diurno</option>
              <option>Noturno</option>
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tecnico</th>
                <th>Jornada</th>
                <th>Embarcacoes</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.id}>
                  <td>{new Intl.DateTimeFormat("pt-BR").format(new Date(`${record.date}T12:00:00`))}</td>
                  <td><strong>{record.technician}</strong><small>{record.id}</small></td>
                  <td>
                    {record.turns.map((turn) => (
                      <span className="journey-line" key={turn.shift}>{turn.shift} · {turn.activity}</span>
                    ))}
                  </td>
                  <td>
                    <div className="vessel-cell">
                      <Ship size={15} />
                      {record.turns.flatMap((turn) => turn.vessels).join(", ")}
                    </div>
                  </td>
                  <td><StatusBadge status={record.status} /></td>
                  <td>
                    <button className="row-action" onClick={() => setSelected(record)}>
                      <FilePenLine size={17} /> Solicitar edicao
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={submitRequest}>
            <div className="modal-header">
              <div><span className="eyebrow">REGISTRO {selected.id}</span><h2>Solicitar edicao</h2></div>
              <button type="button" className="icon-button" onClick={() => setSelected(null)}><X size={20} /></button>
            </div>
            <p>Descreva claramente o erro e a alteracao desejada. O registro so sera modificado apos aprovacao.</p>
            <label className="field">
              <span>Motivo da solicitacao <b>*</b></span>
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} required rows={3} />
            </label>
            <label className="field">
              <span>Alteracao solicitada <b>*</b></span>
              <textarea value={requestedChange} onChange={(event) => setRequestedChange(event.target.value)} required rows={3} />
            </label>
            <div className="form-actions">
              <button type="button" className="button button-secondary" onClick={() => setSelected(null)}>Cancelar</button>
              <button className="button button-primary">Enviar solicitacao</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
