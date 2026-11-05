import { CalendarCheck, Moon, Sun, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchAvailability, saveAvailability } from "../lib/api";
import type { AuthUser, AvailabilityChoice, AvailabilityEntry } from "../types";

interface AvailabilityProps {
  user: AuthUser;
}

const CHOICES: { value: AvailabilityChoice; label: string }[] = [
  { value: "Diurno", label: "Disponível no diurno" },
  { value: "Noturno", label: "Disponível no noturno" },
  { value: "Ambos", label: "Disponível nos dois turnos" },
  { value: "Indisponivel", label: "Indisponível" },
];

const CHOICE_SHORT: Record<AvailabilityChoice, string> = {
  Diurno: "Diurno",
  Noturno: "Noturno",
  Ambos: "Diurno + Noturno",
  Indisponivel: "Indisponível",
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function isAvailable(choice: AvailabilityChoice) {
  return choice !== "Indisponivel";
}

function formatLongDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(new Date(`${date}T12:00:00`));
}

export function Availability({ user }: AvailabilityProps) {
  const isStaff = user.role === "admin" || user.role === "supervisor";
  const today = localToday();
  const month = today.slice(0, 7);
  const [year, monthNumber] = month.split("-").map(Number);
  const [entries, setEntries] = useState<AvailabilityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const reloadRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "unavailable">("all");
  const [shiftFilter, setShiftFilter] = useState<"all" | "Diurno" | "Noturno">("all");

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchAvailability(user, month)
        .then(({ entries: loaded }) => {
          if (!cancelled) setEntries(loaded);
        })
        .catch((loadError: Error) => {
          if (!cancelled) setError(loadError.message);
        });
    load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", refreshOnFocus);
    window.addEventListener("focus", refreshOnFocus);
    reloadRef.current = load;
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", refreshOnFocus);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [month, user]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, AvailabilityEntry[]>();
    entries.forEach((entry) => {
      map.set(entry.date, [...(map.get(entry.date) ?? []), entry]);
    });
    return map;
  }, [entries]);

  const cells = useMemo(() => {
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const offset = new Date(year, monthNumber - 1, 1).getDay();
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => `${month}-${pad(index + 1)}`),
    ];
  }, [month, monthNumber, year]);

  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
    .format(new Date(year, monthNumber - 1, 1));

  function openDay(date: string) {
    if (isStaff) void reloadRef.current();
    setSelectedDate(date);
    setAvailabilityFilter("all");
    setShiftFilter("all");
    setError("");
  }

  async function choose(choice: AvailabilityChoice | null) {
    if (!selectedDate) return;
    setSaving(true);
    setError("");
    try {
      await saveAvailability(user, selectedDate, choice);
      setEntries((current) => {
        const others = current.filter((entry) => !(entry.date === selectedDate && entry.technician === user.name));
        return choice ? [...others, { technician: user.name, date: selectedDate, choice }] : others;
      });
      setSelectedDate(null);
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const selectedEntries = selectedDate ? entriesByDate.get(selectedDate) ?? [] : [];
  const ownChoice = selectedEntries.find((entry) => entry.technician === user.name)?.choice;
  const filteredList = selectedEntries.filter((entry) => {
    if (availabilityFilter === "available" && !isAvailable(entry.choice)) return false;
    if (availabilityFilter === "unavailable" && isAvailable(entry.choice)) return false;
    if (shiftFilter === "Diurno" && !(entry.choice === "Diurno" || entry.choice === "Ambos")) return false;
    if (shiftFilter === "Noturno" && !(entry.choice === "Noturno" || entry.choice === "Ambos")) return false;
    return true;
  });

  return (
    <>
      <section className="page-heading">
        <span className="eyebrow">DISPONIBILIDADE</span>
        <h1>Disponibilidade</h1>
        <p>
          {isStaff
            ? "Acompanhe quantos colaboradores estão disponíveis ou indisponíveis em cada dia. Clique em um dia para ver a lista."
            : "Esta página é onde você indica a sua disponibilidade de acordo com o calendário. Clique em um dia e informe se está disponível no turno diurno, no noturno, nos dois ou se está indisponível."}
        </p>
      </section>

      {error && !selectedDate && <div className="error-banner">{error}</div>}

      <section className="panel availability-panel">
        <div className="panel-header">
          <div>
            <h2 className="availability-month">{monthLabel}</h2>
            <p>{isStaff ? "Somente colaboradores que responderam aparecem na contagem." : "Dias passados não podem ser alterados."}</p>
          </div>
          <CalendarCheck size={22} />
        </div>
        <div className="availability-legend">
          <span className="legend-diurno"><Sun size={12} /> Diurno</span>
          <span className="legend-noturno"><Moon size={12} /> Noturno</span>
          <span className="legend-ambos">Diurno + Noturno</span>
          <span className="legend-indisponivel">Indisponível</span>
        </div>
        <div className="availability-grid">
          {WEEKDAYS.map((weekday) => <div className="availability-weekday" key={weekday}>{weekday}</div>)}
          {cells.map((date, index) => {
            if (!date) return <div className="availability-empty" key={`empty-${index}`} />;
            const day = Number(date.slice(8));
            const dayEntries = entriesByDate.get(date) ?? [];
            const past = date < today;
            if (isStaff) {
              const available = dayEntries.filter((entry) => isAvailable(entry.choice)).length;
              const unavailable = dayEntries.length - available;
              return (
                <button
                  type="button"
                  key={date}
                  className={`availability-day ${date === today ? "today" : ""} ${past ? "past" : ""}`}
                  onClick={() => openDay(date)}
                >
                  <strong>{day}</strong>
                  <span className="availability-count available">{available} disp.</span>
                  <span className="availability-count unavailable">{unavailable} indisp.</span>
                </button>
              );
            }
            const own = dayEntries[0]?.choice;
            return (
              <button
                type="button"
                key={date}
                disabled={past}
                className={`availability-day ${own ? `choice-${own.toLowerCase()}` : ""} ${date === today ? "today" : ""} ${past ? "past" : ""}`}
                onClick={() => openDay(date)}
              >
                <strong>{day}</strong>
                {own && <span className="availability-choice">{CHOICE_SHORT[own]}</span>}
              </button>
            );
          })}
        </div>
        {loading && <p className="availability-loading">Carregando...</p>}
      </section>

      {selectedDate && !isStaff && (
        <div className="modal-backdrop" onClick={() => setSelectedDate(null)}>
          <section className="modal availability-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div><span className="eyebrow">MINHA DISPONIBILIDADE</span><h2>{formatLongDate(selectedDate)}</h2></div>
              <button className="icon-button" type="button" onClick={() => setSelectedDate(null)}><X size={20} /></button>
            </div>
            {error && <div className="error-banner">{error}</div>}
            <div className="availability-options">
              {CHOICES.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  disabled={saving}
                  className={`availability-option choice-${option.value.toLowerCase()} ${ownChoice === option.value ? "selected" : ""}`}
                  onClick={() => choose(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="form-actions">
              {ownChoice && (
                <button className="button button-secondary" type="button" disabled={saving} onClick={() => choose(null)}>
                  Limpar resposta
                </button>
              )}
              <button className="button button-secondary" type="button" onClick={() => setSelectedDate(null)}>Fechar</button>
            </div>
          </section>
        </div>
      )}

      {selectedDate && isStaff && (
        <div className="modal-backdrop" onClick={() => setSelectedDate(null)}>
          <section className="modal availability-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div><span className="eyebrow">DISPONIBILIDADE DO DIA</span><h2>{formatLongDate(selectedDate)}</h2></div>
              <button className="icon-button" type="button" onClick={() => setSelectedDate(null)}><X size={20} /></button>
            </div>
            <div className="availability-filters">
              <label>
                <span>Disponibilidade</span>
                <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value as typeof availabilityFilter)}>
                  <option value="all">Todos</option>
                  <option value="available">Disponíveis</option>
                  <option value="unavailable">Indisponíveis</option>
                </select>
              </label>
              <label>
                <span>Turno</span>
                <select value={shiftFilter} onChange={(event) => setShiftFilter(event.target.value as typeof shiftFilter)}>
                  <option value="all">Todos</option>
                  <option value="Diurno">Diurno</option>
                  <option value="Noturno">Noturno</option>
                </select>
              </label>
            </div>
            <p className="availability-summary">
              {filteredList.length} de {selectedEntries.length} respostas exibidas
            </p>
            <div className="availability-list">
              {filteredList.map((entry) => (
                <div key={entry.technician} className="availability-list-row">
                  <span>{entry.technician}</span>
                  <b className={`availability-pill choice-${entry.choice.toLowerCase()}`}>{CHOICE_SHORT[entry.choice]}</b>
                </div>
              ))}
              {!filteredList.length && (
                <div className="schedule-empty">
                  {selectedEntries.length ? "Nenhuma resposta com esses filtros." : "Nenhum colaborador respondeu para este dia."}
                </div>
              )}
            </div>
            <div className="form-actions">
              <button className="button button-secondary" type="button" onClick={() => setSelectedDate(null)}>Fechar</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
