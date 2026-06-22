import {
  Activity,
  BarChart3,
  CalendarDays,
  Download,
  FileSpreadsheet,
  Filter,
  RefreshCw,
  Ship,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  dateRange,
  downloadBlob,
  flattenActivityFacts,
  toCsv,
  type ActivityFact,
} from "../lib/analytics";
import type { DiaryRecord, SystemSettings } from "../types";

interface AnalyticsProps {
  records: DiaryRecord[];
  settings: SystemSettings;
}

function countBy(rows: ActivityFact[], key: keyof ActivityFact) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const value = String(row[key] || "Nao informado");
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function excelDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function Analytics({ records, settings }: AnalyticsProps) {
  const sortedDates = useMemo(
    () => records.map((record) => record.date).sort(),
    [records],
  );
  const minDate = sortedDates[0] ?? "";
  const maxDate = sortedDates[sortedDates.length - 1] ?? "";
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [technician, setTechnician] = useState("");
  const [vessel, setVessel] = useState("");
  const [activity, setActivity] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!startDate && minDate) setStartDate(minDate);
    if (!endDate && maxDate) setEndDate(maxDate);
  }, [endDate, maxDate, minDate, startDate]);

  const facts = useMemo(() => flattenActivityFacts(records), [records]);
  const filteredFacts = useMemo(
    () => facts.filter((fact) =>
      (!startDate || fact.date >= startDate) &&
      (!endDate || fact.date <= endDate) &&
      (!technician || fact.technician === technician) &&
      (!vessel || fact.vessel === vessel) &&
      (!activity || fact.activity === activity)
    ),
    [activity, endDate, facts, startDate, technician, vessel],
  );
  const recordIds = useMemo(
    () => new Set(filteredFacts.map((fact) => fact.recordId)),
    [filteredFacts],
  );
  const filteredRecords = useMemo(
    () => records.filter((record) => recordIds.has(record.id)),
    [recordIds, records],
  );
  const daily = useMemo(
    () => countBy(filteredFacts, "date").sort((a, b) => a.label.localeCompare(b.label)),
    [filteredFacts],
  );
  const vesselRanking = useMemo(() => countBy(filteredFacts, "vessel").slice(0, 8), [filteredFacts]);
  const technicianRanking = useMemo(() => countBy(filteredFacts, "technician"), [filteredFacts]);
  const activityProfile = useMemo(() => countBy(filteredFacts, "activity"), [filteredFacts]);
  const doubles = filteredRecords.filter((record) => record.turns.length === 2).length;
  const operational = filteredFacts.filter((fact) => fact.activity === "Area").length;
  const activeTechnicians = new Set(filteredFacts.map((fact) => fact.technician)).size;
  const coveredDays = new Set(filteredFacts.map((fact) => fact.date)).size;
  const operationalRate = filteredFacts.length
    ? Math.round((operational / filteredFacts.length) * 100)
    : 0;
  const maxDaily = Math.max(...daily.map((item) => item.value), 1);
  const maxVessel = Math.max(...vesselRanking.map((item) => item.value), 1);
  const activityColors = ["#3734b7", "#e35f61", "#7a91a0"];
  let donutCursor = 0;
  const donutGradient = activityProfile.length
    ? activityProfile.map((item, index) => {
        const start = donutCursor;
        donutCursor += (item.value / filteredFacts.length) * 100;
        return `${activityColors[index % activityColors.length]} ${start}% ${donutCursor}%`;
      }).join(", ")
    : "#e7ecef 0 100%";

  function resetFilters() {
    setStartDate(minDate);
    setEndDate(maxDate);
    setTechnician("");
    setVessel("");
    setActivity("");
  }

  function exportCsv() {
    downloadBlob(
      new Blob([`\uFEFF${toCsv(filteredFacts)}`], { type: "text/csv;charset=utf-8" }),
      `fato-atividades-power-bi-${startDate}-a-${endDate}.csv`,
    );
  }

  async function exportPowerBi() {
    setExporting(true);
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Controle de Diarias TST";
      workbook.created = new Date();

      const factDiary = workbook.addWorksheet("FatoDiarias");
      factDiary.columns = [
        { header: "IdRegistro", key: "id", width: 20 },
        { header: "Data", key: "date", width: 13 },
        { header: "Tecnico", key: "technician", width: 38 },
        { header: "QuantidadeTurnos", key: "turns", width: 18 },
        { header: "Dobra", key: "double", width: 10 },
        { header: "Status", key: "status", width: 22 },
        { header: "Observacoes", key: "notes", width: 50 },
        { header: "CriadoEm", key: "createdAt", width: 22 },
      ];
      filteredRecords.forEach((record) => factDiary.addRow({
        id: record.id,
        date: excelDate(record.date),
        technician: record.technician,
        turns: record.turns.length,
        double: record.turns.length === 2 ? "Sim" : "Nao",
        status: record.status,
        notes: record.notes,
        createdAt: new Date(record.createdAt),
      }));

      const factActivity = workbook.addWorksheet("FatoAtividades");
      factActivity.columns = [
        { header: "IdAtividade", key: "activityId", width: 28 },
        { header: "IdRegistro", key: "recordId", width: 20 },
        { header: "Data", key: "date", width: 13 },
        { header: "Ano", key: "year", width: 10 },
        { header: "MesNumero", key: "monthNumber", width: 12 },
        { header: "Mes", key: "month", width: 14 },
        { header: "AnoMes", key: "yearMonth", width: 12 },
        { header: "Tecnico", key: "technician", width: 38 },
        { header: "Turno", key: "shift", width: 14 },
        { header: "Atividade", key: "activity", width: 18 },
        { header: "Embarcacao", key: "vessel", width: 28 },
        { header: "Dobra", key: "doubleShift", width: 10 },
        { header: "Status", key: "status", width: 22 },
        { header: "Observacoes", key: "notes", width: 50 },
        { header: "CriadoEm", key: "createdAt", width: 22 },
      ];
      filteredFacts.forEach((fact) => factActivity.addRow({
        ...fact,
        date: excelDate(fact.date),
        createdAt: new Date(fact.createdAt),
      }));

      const calendar = workbook.addWorksheet("DimCalendario");
      calendar.columns = [
        { header: "Data", key: "date", width: 13 },
        { header: "Ano", key: "year", width: 10 },
        { header: "Trimestre", key: "quarter", width: 12 },
        { header: "MesNumero", key: "monthNumber", width: 12 },
        { header: "Mes", key: "month", width: 14 },
        { header: "AnoMes", key: "yearMonth", width: 12 },
        { header: "Dia", key: "day", width: 10 },
        { header: "DiaSemana", key: "weekday", width: 16 },
      ];
      dateRange(startDate || minDate, endDate || maxDate).forEach((value) => {
        const date = excelDate(value);
        calendar.addRow({
          date,
          year: date.getFullYear(),
          quarter: `T${Math.floor(date.getMonth() / 3) + 1}`,
          monthNumber: date.getMonth() + 1,
          month: new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(date),
          yearMonth: value.slice(0, 7),
          day: date.getDate(),
          weekday: new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date),
        });
      });

      const technicianDim = workbook.addWorksheet("DimTecnicos");
      technicianDim.columns = [
        { header: "Tecnico", key: "technician", width: 38 },
        { header: "DiariasPeriodo", key: "diaries", width: 18 },
        { header: "AtendimentosPeriodo", key: "activities", width: 20 },
      ];
      settings.technicians.forEach((name) => {
        const technicianFacts = filteredFacts.filter((fact) => fact.technician === name);
        technicianDim.addRow({
          technician: name,
          diaries: new Set(technicianFacts.map((fact) => fact.recordId)).size,
          activities: technicianFacts.length,
        });
      });

      const vesselDim = workbook.addWorksheet("DimEmbarcacoes");
      vesselDim.columns = [
        { header: "Embarcacao", key: "vessel", width: 30 },
        { header: "AtendimentosPeriodo", key: "activities", width: 20 },
      ];
      settings.vessels.forEach((name) => vesselDim.addRow({
        vessel: name,
        activities: filteredFacts.filter((fact) => fact.vessel === name).length,
      }));

      const summary = workbook.addWorksheet("Resumo");
      summary.addRows([
        ["MODELO PARA POWER BI - CONTROLE DE DIARIAS TST"],
        ["Periodo inicial", startDate],
        ["Periodo final", endDate],
        ["Diarias", filteredRecords.length],
        ["Atendimentos", filteredFacts.length],
        ["Tecnicos ativos", activeTechnicians],
        ["Dobras", doubles],
        ["Percentual operacional", operationalRate / 100],
        [],
        ["Relacionamentos sugeridos"],
        ["FatoAtividades[IdRegistro]", "FatoDiarias[IdRegistro]"],
        ["FatoAtividades[Data]", "DimCalendario[Data]"],
        ["FatoAtividades[Tecnico]", "DimTecnicos[Tecnico]"],
        ["FatoAtividades[Embarcacao]", "DimEmbarcacoes[Embarcacao]"],
      ]);
      summary.getCell("B8").numFmt = "0%";

      [factDiary, factActivity, calendar, technicianDim, vesselDim].forEach((sheet) => {
        sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        sheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF3734B7" },
        };
        sheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: sheet.columnCount },
        };
        sheet.views = [{ state: "frozen", ySplit: 1 }];
        const dateColumn = sheet.columns.find((column) => column.key === "date");
        if (dateColumn) dateColumn.numFmt = "dd/mm/yyyy";
        const createdColumn = sheet.columns.find((column) => column.key === "createdAt");
        if (createdColumn) createdColumn.numFmt = "dd/mm/yyyy hh:mm";
      });
      summary.getColumn(1).width = 42;
      summary.getColumn(2).width = 28;
      summary.getRow(1).font = { bold: true, size: 15, color: { argb: "FF3734B7" } };

      const buffer = await workbook.xlsx.writeBuffer();
      downloadBlob(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `modelo-power-bi-tst-${startDate}-a-${endDate}.xlsx`,
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <section className="page-heading heading-with-action bi-heading">
        <div>
          <span className="eyebrow">INTELIGENCIA OPERACIONAL</span>
          <h1>Metricas e Power BI</h1>
          <p>Visualize os indicadores online e exporte um modelo de dados pronto para analise.</p>
        </div>
        <div className="bi-export-actions">
          <button className="button button-secondary" onClick={exportCsv} disabled={!filteredFacts.length}>
            <Download size={18} /> CSV
          </button>
          <button className="button button-primary" onClick={exportPowerBi} disabled={exporting || !filteredFacts.length}>
            <FileSpreadsheet size={18} /> {exporting ? "Gerando..." : "Exportar Power BI"}
          </button>
        </div>
      </section>

      <section className="panel bi-filter-panel">
        <div className="bi-filter-title">
          <div><Filter size={18} /><strong>Filtros da analise</strong></div>
          <button className="text-link" onClick={resetFilters}><RefreshCw size={15} /> Limpar filtros</button>
        </div>
        <div className="bi-filters">
          <label className="field"><span>Data inicial</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label className="field"><span>Data final</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
          <label className="field"><span>Tecnico</span><select value={technician} onChange={(event) => setTechnician(event.target.value)}><option value="">Todos</option>{settings.technicians.map((name) => <option key={name}>{name}</option>)}</select></label>
          <label className="field"><span>Embarcacao</span><select value={vessel} onChange={(event) => setVessel(event.target.value)}><option value="">Todas</option>{settings.vessels.map((name) => <option key={name}>{name}</option>)}</select></label>
          <label className="field"><span>Atividade</span><select value={activity} onChange={(event) => setActivity(event.target.value)}><option value="">Todas</option><option value="Area">Operacional / Area</option><option value="ADM">Administrativa</option><option value="Não informado">Nao informado</option></select></label>
        </div>
      </section>

      <section className="bi-kpi-grid">
        <Kpi icon={CalendarDays} label="Diarias" value={filteredRecords.length} note={`${coveredDays} dias com atividade`} />
        <Kpi icon={BarChart3} label="Atendimentos" value={filteredFacts.length} note={`${doubles} dobras no periodo`} />
        <Kpi icon={Users} label="Tecnicos ativos" value={activeTechnicians} note={`${technicianRanking.length} nomes com atividade`} />
        <Kpi icon={Activity} label="Atividade operacional" value={`${operationalRate}%`} note={`${operational} atividades de area`} />
      </section>

      <section className="bi-dashboard-grid">
        <article className="panel bi-chart-card">
          <ChartHeader title="Evolucao diaria" subtitle="Quantidade de atendimentos por dia" icon={BarChart3} />
          {daily.length ? (
            <div className="daily-chart">
              {daily.map((item) => (
                <div className="daily-bar-item" key={item.label} title={`${item.label}: ${item.value}`}>
                  <strong>{item.value}</strong>
                  <span style={{ height: `${Math.max((item.value / maxDaily) * 100, 6)}%` }} />
                  <small>{item.label.slice(8, 10)}/{item.label.slice(5, 7)}</small>
                </div>
              ))}
            </div>
          ) : <EmptyChart />}
        </article>

        <article className="panel bi-chart-card">
          <ChartHeader title="Perfil da atividade" subtitle="Operacional x administrativa" icon={Activity} />
          {activityProfile.length ? (
            <div className="donut-layout">
              <div className="donut-chart" style={{ background: `conic-gradient(${donutGradient})` }}>
                <span><b>{filteredFacts.length}</b><small>Total</small></span>
              </div>
              <div className="chart-legend">
                {activityProfile.map((item, index) => (
                  <div key={item.label}>
                    <i style={{ background: activityColors[index % activityColors.length] }} />
                    <span>{item.label}</span>
                    <strong>{Math.round((item.value / filteredFacts.length) * 100)}%</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : <EmptyChart />}
        </article>

        <article className="panel bi-chart-card">
          <ChartHeader title="Embarcacoes atendidas" subtitle="Top 8 por volume de atendimentos" icon={Ship} />
          {vesselRanking.length ? (
            <div className="horizontal-bars">
              {vesselRanking.map((item) => (
                <div key={item.label}>
                  <span title={item.label}>{item.label}</span>
                  <div><i style={{ width: `${(item.value / maxVessel) * 100}%` }} /></div>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          ) : <EmptyChart />}
        </article>

        <article className="panel bi-chart-card">
          <ChartHeader title="Ranking de tecnicos" subtitle="Atendimentos registrados no periodo" icon={Users} />
          {technicianRanking.length ? (
            <div className="ranking-list">
              {technicianRanking.slice(0, 10).map((item, index) => (
                <div key={item.label}><b>{index + 1}</b><span>{item.label}</span><strong>{item.value}</strong></div>
              ))}
            </div>
          ) : <EmptyChart />}
        </article>
      </section>
    </>
  );
}

interface KpiProps {
  icon: typeof BarChart3;
  label: string;
  value: string | number;
  note: string;
}

function Kpi({ icon: Icon, label, value, note }: KpiProps) {
  return (
    <article className="bi-kpi">
      <span><Icon size={21} /></span>
      <div><small>{label}</small><strong>{value}</strong><em>{note}</em></div>
    </article>
  );
}

function ChartHeader({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: typeof BarChart3 }) {
  return (
    <header className="bi-chart-header">
      <span><Icon size={18} /></span>
      <div><h2>{title}</h2><p>{subtitle}</p></div>
    </header>
  );
}

function EmptyChart() {
  return <div className="bi-empty">Nenhum dado encontrado para os filtros selecionados.</div>;
}
