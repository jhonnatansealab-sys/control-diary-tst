import { AlertCircle, ArrowLeft, CheckCircle2, Download, Eye, FileText, Moon, Paperclip, Save, Sun, Trash2 } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ReportViewerModal } from "../components/ReportViewerModal";
import { VesselSelect } from "../components/VesselSelect";
import { cboVesselsIn } from "../lib/clients";
import { downloadDataUrl, formatFileSize, isViewableReport, readReportFile, REPORT_ACCEPT, type ReportPayload } from "../lib/reportFile";
import type { Activity, AuthUser, DiaryRecord, Shift, SystemSettings, TurnEntry } from "../types";

interface NewDiaryProps {
  user: AuthUser;
  records: DiaryRecord[];
  settings: SystemSettings;
  onSave: (record: DiaryRecord, report?: ReportPayload) => Promise<string | null>;
  showPaymentWarning: boolean;
  onDismissPaymentWarning: () => void;
}

function localDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

const emptyTurn: TurnEntry = { shift: "Diurno", activity: "Area", vessels: [] };

export function NewDiary({
  user,
  records,
  settings,
  onSave,
  showPaymentWarning,
  onDismissPaymentWarning,
}: NewDiaryProps) {
  const navigate = useNavigate();
  const today = localDate();
  const [date, setDate] = useState(today);
  const [technician, setTechnician] = useState(
    user.role === "colaborador" ? user.name : settings.technicians[0],
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
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [viewingReport, setViewingReport] = useState(false);
  const [reportError, setReportError] = useState("");
  const existingRecord = user.role === "colaborador"
    ? records.find(
        (record) =>
          record.technician === user.name &&
          record.date === date,
      )
    : undefined;

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

  const cboVessels = cboVesselsIn(
    [...firstTurn.vessels, ...(hasDouble ? secondTurn.vessels : [])],
    settings.vesselClients,
  );
  const reportRequired = user.role === "colaborador" && cboVessels.length > 0;

  async function chooseReport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setReport(await readReportFile(file));
      setReportError("");
    } catch (fileError) {
      setReportError((fileError as Error).message);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (user.role === "colaborador" && date > today) {
      setError("Nao e permitido registrar diaria em uma data futura.");
      return;
    }
    if (existingRecord) {
      setError("Voce ja possui uma diaria registrada nesta data.");
      return;
    }
    if (!firstTurn.vessels.length || (hasDouble && !secondTurn.vessels.length)) {
      setError("Informe uma embarcação para cada turno.");
      return;
    }

    if (reportRequired && !report) {
      setError("O relatório de atividades é obrigatório para embarcações do cliente CBO.");
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
    setSaving(true);
    setError("");
    const saveError = await onSave(record, report ?? undefined);
    if (saveError) {
      setError(saveError);
      setSaving(false);
      return;
    }
    navigate("/registros", { state: { saved: true } });
  }

  return (
    <>
      {user.role === "colaborador" && showPaymentWarning && (
        <div className="payment-warning-backdrop" role="dialog" aria-modal="true" aria-labelledby="payment-warning-title">
          <section className="payment-warning-modal">
            <span className="payment-warning-icon"><AlertCircle size={46} /></span>
            <span className="payment-warning-eyebrow">LEMBRETE</span>
            <h2 id="payment-warning-title">
              A responsabilidade pelo preenchimento correto em cada atendimento é do colaborador
            </h2>
            <p>
              A ausência de registro impacta diretamente a apuração financeira.
            </p>
            <button className="button payment-warning-button" onClick={onDismissPaymentWarning}>
              Entendi, preencher agora
            </button>
          </section>
        </div>
      )}
      <section className="page-heading compact-heading">
        <button className="back-link" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Voltar
        </button>
        <span className="eyebrow">NOVO REGISTRO</span>
        <h1>Registrar diaria</h1>
        <p>Preencha os dados da jornada. Os campos marcados sao obrigatorios.</p>
      </section>

      {viewingReport && report && <ReportViewerModal report={report} onClose={() => setViewingReport(false)} />}
      <form className="diary-form" onSubmit={submit}>
        <section className="form-card">
          <div className="form-card-header">
            <span>1</span>
            <div><h2>Dados gerais</h2><p>Identificacao do tecnico e data da jornada</p></div>
          </div>
          <div className="form-grid two-columns">
            <label className="field">
              <span>Data da diaria <b>*</b></span>
              <input
                type="date"
                value={date}
                max={user.role === "colaborador" ? today : undefined}
                onChange={(event) => setDate(event.target.value)}
                required
              />
              <small>Preenchida automaticamente com a data de hoje.</small>
            </label>
            <label className="field">
              <span>Tecnico <b>*</b></span>
              <select
                value={technician}
                onChange={(event) => setTechnician(event.target.value)}
                disabled={user.role === "colaborador"}
              >
                {settings.technicians.map((name) => <option key={name}>{name}</option>)}
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
          vessels={settings.vessels}
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
              vessels={settings.vessels}
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

        <section className="form-card">
          <div className="form-card-header">
            <span>{hasDouble ? 5 : 4}</span>
            <div><h2>Relatorio de atividades {reportRequired ? <b>*</b> : <em>Opcional</em>}</h2><p>{reportRequired ? `Obrigatorio: embarcacao do cliente CBO (${cboVessels.join(", ")})` : "Anexe o relatorio do dia, se houver"}</p></div>
          </div>
          {report ? (
            <div className="report-attachment">
              <FileText size={20} />
              <div className="report-attachment-info">
                <strong>{report.fileName}</strong>
                <small>{formatFileSize(report.size)}</small>
              </div>
              <div className="report-attachment-actions">
                <button type="button" disabled={!isViewableReport(report.mimeType)} onClick={() => setViewingReport(true)} aria-label="Visualizar relatorio" title={isViewableReport(report.mimeType) ? "Visualizar" : "Pre-visualizacao indisponivel para Word"}><Eye size={15} /></button>
                <button type="button" onClick={() => downloadDataUrl(report.fileName, report.dataUrl)} aria-label="Baixar relatorio"><Download size={15} /></button>
                <button type="button" className="report-remove" onClick={() => setReport(null)} aria-label="Remover relatorio"><Trash2 size={15} /></button>
              </div>
            </div>
          ) : (
            <label className="button button-secondary reimbursement-upload">
              <Paperclip size={16} /> Anexar relatorio
              <input type="file" accept={REPORT_ACCEPT} onChange={chooseReport} hidden />
            </label>
          )}
          <p className="report-upload-hint">Formatos: JPG, PNG, PDF, DOC ou DOCX. Tamanho maximo: 2 MB.</p>
          {reportError && <div className="error-banner"><AlertCircle size={18} /> {reportError}</div>}
        </section>

        {existingRecord && (
          <div className="error-banner">
            <AlertCircle size={18} />
            Voce ja registrou uma diaria para esta data. Para corrigir dados, utilize
            a opcao de solicitar edicao no historico.
          </div>
        )}
        {error && !existingRecord && (
          <div className="error-banner"><AlertCircle size={18} /> {error}</div>
        )}

        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={() => navigate(-1)}>
            Cancelar
          </button>
          <button
            type="submit"
            className="button button-primary"
            disabled={saving || Boolean(existingRecord)}
          >
            <Save size={18} /> {saving ? "Salvando..." : "Salvar diaria"}
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
  vessels: string[];
}

function TurnCard({ number, title, subtitle, turn, onChange, lockShift, vessels }: TurnCardProps) {
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
          <span>Embarcação <b>*</b></span>
          <VesselSelect
            id={`vessels-turn-${number}`}
            value={turn.vessels}
            onChange={(vessels) => onChange({ vessels })}
            options={vessels}
            single
          />
          <small>Selecione a embarcação atendida neste turno.</small>
        </label>
      </div>
    </section>
  );
}
