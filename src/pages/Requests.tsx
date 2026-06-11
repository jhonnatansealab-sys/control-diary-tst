import { Check, Clock3, X } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import type { AuthUser, EditRequest } from "../types";

interface RequestsProps {
  user: AuthUser;
  requests: EditRequest[];
  onStatusChange: (id: string, status: "Aprovada" | "Rejeitada") => void;
}

export function Requests({ user, requests, onStatusChange }: RequestsProps) {
  const visible =
    user.role === "colaborador"
      ? requests.filter((request) => request.technician === user.name)
      : requests;

  return (
    <>
      <section className="page-heading">
        <span className="eyebrow">CORRECOES</span>
        <h1>Solicitacoes de edicao</h1>
        <p>
          {user.role === "colaborador"
            ? "Acompanhe o andamento das correcoes solicitadas."
            : "Analise as solicitacoes enviadas pelos tecnicos."}
        </p>
      </section>
      <section className="request-grid">
        {visible.map((request) => (
          <article className="request-card" key={request.id}>
            <div className="request-card-header">
              <span className="request-icon"><Clock3 size={20} /></span>
              <div><strong>{request.technician}</strong><small>{request.id} · Registro {request.recordId}</small></div>
              <StatusBadge status={request.status} />
            </div>
            <dl>
              <div><dt>Data da diaria</dt><dd>{new Intl.DateTimeFormat("pt-BR").format(new Date(`${request.date}T12:00:00`))}</dd></div>
              <div><dt>Motivo</dt><dd>{request.reason}</dd></div>
              <div><dt>Alteracao solicitada</dt><dd>{request.requestedChange}</dd></div>
            </dl>
            {user.role !== "colaborador" && request.status === "Pendente" && (
              <div className="request-actions">
                <button className="button button-danger-ghost" onClick={() => onStatusChange(request.id, "Rejeitada")}>
                  <X size={17} /> Rejeitar
                </button>
                <button className="button button-primary" onClick={() => onStatusChange(request.id, "Aprovada")}>
                  <Check size={17} /> Aprovar
                </button>
              </div>
            )}
          </article>
        ))}
      </section>
    </>
  );
}
