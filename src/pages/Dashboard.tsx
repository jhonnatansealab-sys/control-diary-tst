import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  FilePenLine,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import type { AuthUser, DiaryRecord, EditRequest } from "../types";

interface DashboardProps {
  user: AuthUser;
  records: DiaryRecord[];
  requests: EditRequest[];
}

function dateParts(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  return {
    day: new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(parsed),
    month: new Intl.DateTimeFormat("pt-BR", { month: "short" })
      .format(parsed)
      .replace(".", ""),
  };
}

export function Dashboard({ user, records, requests }: DashboardProps) {
  const now = new Date();
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
  const headingDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  })
    .format(now)
    .toUpperCase();
  const pending = requests.filter((request) => request.status === "Pendente").length;
  const doubles = records.filter((record) => record.turns.length === 2).length;
  const visibleRecords =
    user.role === "colaborador"
      ? records.filter((record) => record.technician === user.name)
      : records;
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <section className="page-heading heading-with-action">
        <div>
          <span className="eyebrow">{headingDate}</span>
          <h1>Ola, {firstName}</h1>
          <p>
            {user.role === "colaborador"
              ? "Registre sua jornada e acompanhe suas diarias."
              : "Acompanhe os registros e pendencias da equipe."}
          </p>
        </div>
        <Link to="/novo" className="button button-primary">
          <Plus size={19} />
          Registrar diaria
        </Link>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <span className="stat-icon teal"><CalendarCheck size={22} /></span>
          <div><strong>{visibleRecords.length}</strong><span>Registros recentes</span></div>
          <small className="positive">Historico disponivel</small>
        </article>
        <article className="stat-card">
          <span className="stat-icon amber"><Clock3 size={22} /></span>
          <div><strong>{pending}</strong><span>Edicoes pendentes</span></div>
          <small>{user.role === "colaborador" ? "Aguardando supervisor" : "Requerem sua analise"}</small>
        </article>
        <article className="stat-card">
          <span className="stat-icon blue"><CheckCircle2 size={22} /></span>
          <div><strong>{records.filter((record) => record.date === today).length}</strong><span>Registros hoje</span></div>
          <small>Atualizado agora</small>
        </article>
        <article className="stat-card">
          <span className="stat-icon purple"><FilePenLine size={22} /></span>
          <div><strong>{doubles}</strong><span>Dobras registradas</span></div>
          <small>Dois turnos vinculados</small>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Registros recentes</h2>
            <p>Ultimas jornadas informadas no sistema</p>
          </div>
          <Link to="/registros" className="text-link">Ver todos <ArrowRight size={16} /></Link>
        </div>
        <div className="record-list">
          {visibleRecords.slice(0, 5).map((record) => (
            <article className="record-row" key={record.id}>
              <div className="date-block">
                <strong>{dateParts(record.date).day}</strong>
                <span>{dateParts(record.date).month}</span>
              </div>
              <div className="record-main">
                <strong>{record.technician}</strong>
                <span>
                  {record.turns.map((turn) => `${turn.shift} · ${turn.activity}`).join(" + ")}
                </span>
              </div>
              <div className="vessel-tags">
                {record.turns.flatMap((turn) => turn.vessels).map((vessel) => (
                  <span key={`${record.id}-${vessel}`}>{vessel}</span>
                ))}
              </div>
              <StatusBadge status={record.status} />
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
