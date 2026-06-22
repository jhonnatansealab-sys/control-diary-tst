import ExcelJS from "exceljs";

const workbook = new ExcelJS.Workbook();
const factDiary = workbook.addWorksheet("FatoDiarias");
factDiary.columns = [
  { header: "IdRegistro", key: "id" },
  { header: "Data", key: "date" },
  { header: "Tecnico", key: "technician" },
];
factDiary.addRow({
  id: "TEST-001",
  date: new Date("2026-06-22T12:00:00"),
  technician: "Tecnico Teste",
});

const factActivity = workbook.addWorksheet("FatoAtividades");
factActivity.columns = [
  { header: "IdAtividade", key: "activityId" },
  { header: "IdRegistro", key: "recordId" },
  { header: "Data", key: "date" },
  { header: "Embarcacao", key: "vessel" },
];
factActivity.addRow({
  activityId: "TEST-001-1-1",
  recordId: "TEST-001",
  date: new Date("2026-06-22T12:00:00"),
  vessel: "SKANDI CARLA",
});

["DimCalendario", "DimTecnicos", "DimEmbarcacoes", "Resumo"].forEach((name) => {
  workbook.addWorksheet(name);
});

const buffer = await workbook.xlsx.writeBuffer();
const loaded = new ExcelJS.Workbook();
await loaded.xlsx.load(buffer);
const expected = [
  "FatoDiarias",
  "FatoAtividades",
  "DimCalendario",
  "DimTecnicos",
  "DimEmbarcacoes",
  "Resumo",
];
const actual = loaded.worksheets.map((sheet) => sheet.name);
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(`Planilhas inesperadas: ${actual.join(", ")}`);
}
if (loaded.getWorksheet("FatoAtividades").rowCount !== 2) {
  throw new Error("A tabela fato nao foi preservada na exportacao.");
}
console.log(JSON.stringify({ worksheets: actual, bytes: buffer.byteLength }));
