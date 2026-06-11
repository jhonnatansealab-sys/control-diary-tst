import { AlertCircle, ArrowLeft, CheckCircle2, Moon, Save, Sun } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { VesselSelect } from "../components/VesselSelect";
import { technicians } from "../data";
import type { Activity, AuthUser, DiaryRecord, Shift, TurnEntry } from "../types";

interface NewDiaryProps {
  user: AuthUser;
  onSave: (record: DiaryRecord) => void;
}

function localDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

const emptyTurn: TurnEntry = { shift: "Diurno", activity: "Area", vessels: [] };

export function NewDiary({ user, onSave }: NewDiaryProps) {
  const navigate = useNavigate();
  const [date, setDate] = useState(localDate());
  const [technician, setTechnician] = useState(
    user.role === "colaborador" ? user.name : technicians[0],
  );
  const [firstTurn, setFirstTurn] = useState<TurnEntry>(emptyTurn);
  const [hasDouble, setHasDouble] = useState(false);
  const [secondTurn, setSecondTurn] = useState<TurnEntry>({
    shift: "Noturno",
    activity: "Area",
    vessels: [],
  });
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function updateFirst(patch: Partial<TurnEntry>) {
    const next = { ...firstTurn, ...patch };
    setFirstTurn(next);
    if (patch.shift) {
      setSecondTurn((current) => ({
        ...current,
        shift: patch.shift === "Diurno" ? "Noturno" : "Diurno",
      }));
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!firstTurn.vessels.length || (hasDouble && !secondTurn.vessels.length)) {
      setError("Informe ao menos uma embarcacao para cada turno.");
      return;
    }

    const record: DiaryRecord = {
      id: `REG-${Date.now().toString().slice(-6)}`,
      date,
      technician,
      turns: hasDouble ? [firstTurn, secondTurn] : [firstTurn],
      notes: notes.trim(),
      status: "Registrado",
      createdAt: new Date().toISOString(),
      selfieSessionId: user.selfieSessionId,
    };
    onSave(record);
    navigate("/registros", { state: { saved: true } });
  }

  return (
    <>
      <section className="page-heading compact-heading">
        <button className="back-link" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Voltar
        </button>
        <span className="eyebrow">NOVO REGISTRO</span>
        <h1>Registrar diaria</h1>
        <p>Preencha os dados da jornada. Os campos marcados sao obrigatorios.</p>
      </section>

      <form className="diary-form" onSubmit={submit}>
        <section className="form-card">
          <div className="form-card-header">
            <span>1</span>
            <div><h2>Dados gerais</h2><p>Identificacao do tecnico e data da jornada</p></div>
          </div>
          <div className="form-grid two-columns">
            <label className="field">
              <span>Data da diaria <b>*</b></span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
              <small>Preenchida automaticamente com a data de hoje.</small>
            </label>
            <label className="field">
              <span>Tecnico <b>*</b></span>
              <select
                value={technician}
                onChange={(event) => setTechnician(event.target.value)}
                disabled={user.role === "colaborador"}
              >
                {technicians.map((name) => <option key={name}>{name}</option>)}
              </select>
              {user.role === "colaborador" && <small>Identificado automaticamente pelo seu acesso.</small>}
            </label>
          </div>
        </section>

        <TurnCard
          number={1}
          title="Primeiro turno"
          turn={firstTurn}
          onChange={updateFirst}
        />

        <section className="double-toggle-card">
          <div>
            <strong>Houve dobra nesta data?</strong>
            <span>Ative para registrar uma jornada no turno oposto.</span>
          </div>
          <button
            type="button"
            className={`switch ${hasDouble ? "on" : ""}`}
            onClick={() => setHasDouble((current) => !current)}
            aria-pressed={hasDouble}
            aria-label="Houve dobra nesta data"
          >
            <span />
          </button>
        </section>

        {hasDouble && (
          <>
            <div className="info-banner">
              <CheckCircle2 size={20} />
              <div>
                <strong>Dobra configurada corretamente</strong>
                <span>O segundo turno foi definido automaticamente como {secondTurn.shift}.</span>
              </div>
            </div>
            <TurnCard
              number={2}
              title="Segundo turno"
              subtitle="Turno oposto vinculado a esta dobra"
              turn={secondTurn}
              onChange={(patch) => setSecondTurn((current) => ({ ...current, ...patch }))}
              lockShift
            />
          </>
        )}

        <section className="form-card">
          <div className="form-card-header">
            <span>{hasDouble ? 4 : 3}</span>
            <div><h2>Observacoes</h2><p>Acrescente informacoes relevantes para a supervisao</p></div>
          </div>
          <label className="field">
            <span>Observacoes <em>Opcional</em></span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ex.: apoio em atividade especifica, troca autorizada..."
              rows={4}
              maxLength={500}
            />
            <small className="character-count">{notes.length}/500</small>
          </label>
        </section>

        {error && <div className="error-banner"><AlertCircle size={18} /> {error}</div>}

        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={() => navigate(-1)}>
            Cancelar
          </button>
          <button type="submit" className="button button-primary">
            <Save size={18} /> Salvar diaria
          </button>
        </div>
      </form>
    </>
  );
}

interface TurnCardProps {
  number: number;
  title: string;
  subtitle?: string;
  turn: TurnEntry;
  onChange: (patch: Partial<TurnEntry>) => void;
  lockShift?: boolean;
}

function TurnCard({ number, title, subtitle, turn, onChange, lockShift }: TurnCardProps) {
  return (
    <section className="form-card">
      <div className="form-card-header">
        <span>{number + 1}</span>
        <div><h2>{title}</h2><p>{subtitle ?? "Informe o periodo, a atividade e a embarcacao"}</p></div>
      </div>
      <div className="form-grid">
        <fieldset className="field">
          <legend>Turno <b>*</b></legend>
          <div className="segmented">
            {(["Diurno", "Noturno"] as Shift[]).map((shift) => (
              <button
                key={shift}
                type="button"
                disabled={lockShift}
                className={turn.shift === shift ? "selected" : ""}
                onClick={() => onChange({ shift })}
              >
                {shift === "Diurno" ? <Sun size={19} /> : <Moon size={19} />}
                {shift}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="field">
          <legend>Atividade <b>*</b></legend>
          <div className="segmented">
            {(["Area", "ADM"] as Activity[]).map((activity) => (
              <button
                key={activity}
                type="button"
                className={turn.activity === activity ? "selected" : ""}
                onClick={() => onChange({ activity })}
              >
                {activity === "Area" ? "Operacional / Area" : "Administrativa"}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="field full-width">
          <span>Embarcacao <b>*</b></span>
          <VesselSelect
            id={`vessels-turn-${number}`}
            value={turn.vessels}
            onChange={(vessels) => onChange({ vessels })}
          />
          <small>Selecione todas as embarcacoes atendidas neste turno.</small>
        </label>
      </div>
    </section>
  );
}
