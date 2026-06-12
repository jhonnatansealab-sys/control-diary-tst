import { Check, Clock3, X } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import type { AuthUser, DiaryRecord, EditRequest } from "../types";

interface RequestsProps {
  user: AuthUser;
  requests: EditRequest[];
  onStatusChange: (id: string, status: "Aprovada" | "Rejeitada") => void;
}

export function Requests({ user, requests, onStatusChange }: RequestsProps) {
  const visible = user.role === "colaborador"
    ? requests.filter((request) => request.technician === user.name)
    : requests;

  return (
    <>
      <section className="page-heading">
        <span className="eyebrow">CORREÇÕES</span>
        <h1>Solicitações de edição</h1>
        <p>{user.role === "colaborador" ? "Acompanhe o andamento das correções solicitadas." : "Compare o registro original com a versão proposta pelo técnico."}</p>
      </section>
      <section className="request-list">
        {visible.map((request) => (
          <article className="request-card comparison-request" key={request.id}>
            <div className="request-card-header">
              <span className="request-icon"><Clock3 size={20} /></span>
              <div><strong>{request.technician}</strong><small>{request.id} · Registro {request.recordId}</small></div>
              <StatusBadge status={request.status} />
            </div>
            <div className="change-reason"><strong>Motivo da mudança</strong><p>{request.reason}</p></div>
            <div className="comparison-grid">
              <RecordSnapshot title="Registro anterior" record={request.originalRecord} />
              <RecordSnapshot title="Alteração solicitada" record={request.proposedRecord} proposed />
            </div>
            {user.role === "supervisor" && request.status === "Pendente" && (
              <div className="request-actions">
                <button className="button button-danger-ghost" onClick={() => onStatusChange(request.id, "Rejeitada")}><X size={17} /> Rejeitar</button>
                <button className="button button-primary" onClick={() => onStatusChange(request.id, "Aprovada")}><Check size={17} /> Aprovar e sobrescrever</button>
              </div>
            )}
          </article>
        ))}
      </section>
    </>
  );
}

function RecordSnapshot({ title, record, proposed = false }: { title: string; record: DiaryRecord; proposed?: boolean }) {
  return (
    <section className={`record-snapshot ${proposed ? "proposed" : ""}`}>
      <h3>{title}</h3>
      <dl>
        <div><dt>Data</dt><dd>{new Intl.DateTimeFormat("pt-BR").format(new Date(`${record.date}T12:00:00`))}</dd></div>
        {record.turns.map((turn, index) => (
          <div key={`${turn.shift}-${index}`}>
            <dt>{turn.shift}</dt>
            <dd>{turn.activity} · {turn.vessels.join(", ")}</dd>
          </div>
        ))}
        <div><dt>Observações</dt><dd>{record.notes || "Sem observações"}</dd></div>
      </dl>
    </section>
  );
}
