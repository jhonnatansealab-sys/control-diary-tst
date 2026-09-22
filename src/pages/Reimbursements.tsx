import { FileSpreadsheet, Plus, Receipt, Search, Trash2, X } from "lucide-react";
import { useMemo, useState, type ChangeEvent } from "react";
import type { AuthUser, ReimbursementReceipt, ReimbursementRequest, SystemSettings } from "../types";

interface ReimbursementsProps {
  user: AuthUser;
  settings: SystemSettings;
  records: ReimbursementRequest[];
  onCreate: (request: ReimbursementRequest) => Promise<boolean>;
}

function createReceiptId() {
  return `RCP-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function currency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateTime(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function readReceiptImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function resizeReceiptImage(source: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const maxDim = 1200;
      let width = image.naturalWidth;
      let height = image.naturalHeight;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Não foi possível processar a imagem."));
        return;
      }
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    image.onerror = () => reject(new Error("Formato de imagem não suportado."));
    image.src = source;
  });
}

export function Reimbursements({ user, settings, records, onCreate }: ReimbursementsProps) {
  const isStaff = ["admin", "supervisor", "financeiro"].includes(user.role);
  const [receipts, setReceipts] = useState<ReimbursementReceipt[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReimbursementRequest | null>(null);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({ technician: "Todos", from: "", to: "" });
  const [query, setQuery] = useState("");

  const total = receipts.reduce((sum, receipt) => sum + (receipt.value || 0), 0);

  async function addReceiptFromFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setProcessing(true);
    setError("");
    try {
      const source = await readReceiptImage(file);
      const imageData = await resizeReceiptImage(source);
      setReceipts((current) => [...current, { id: createReceiptId(), imageData, fileName: file.name, value: 0 }]);
    } catch (imageError) {
      setError((imageError as Error).message);
    } finally {
      setProcessing(false);
    }
  }

  function updateReceiptValue(id: string, value: number) {
    setReceipts((current) => current.map((receipt) => (receipt.id === id ? { ...receipt, value } : receipt)));
  }

  function removeReceipt(id: string) {
    setReceipts((current) => current.filter((receipt) => receipt.id !== id));
  }

  async function submit() {
    if (!receipts.length) {
      setError("Adicione ao menos um comprovante.");
      return;
    }
    if (receipts.some((receipt) => !receipt.value || receipt.value <= 0)) {
      setError("Informe um valor válido para cada comprovante.");
      return;
    }
    setSaving(true);
    const request: ReimbursementRequest = {
      id: `REEMB-${Date.now()}`,
      technician: user.name,
      receipts,
      total,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };
    const saved = await onCreate(request);
    setSaving(false);
    if (!saved) {
      setError("Não foi possível enviar a solicitação.");
      return;
    }
    setReceipts([]);
    setNotes("");
    setError("");
  }

  const myRequests = useMemo(
    () => records
      .filter((request) => request.technician === user.name)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [records, user.name],
  );

  const filteredRequests = useMemo(() => {
    const term = normalizeText(query.trim());
    return records
      .filter((request) => {
        if (filters.technician !== "Todos" && request.technician !== filters.technician) return false;
        if (filters.from && request.createdAt.slice(0, 10) < filters.from) return false;
        if (filters.to && request.createdAt.slice(0, 10) > filters.to) return false;
        if (!term) return true;
        return normalizeText(`${request.technician} ${request.notes ?? ""}`).includes(term);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [filters, query, records]);

  const grandTotal = filteredRequests.reduce((sum, request) => sum + request.total, 0);

  async function exportReimbursements() {
    setExporting(true);
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Controle de Diarias TST";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Solicitacoes");
      sheet.columns = [
        { header: "IdSolicitacao", key: "id", width: 24 },
        { header: "Tecnico", key: "technician", width: 34 },
        { header: "QuantidadeComprovantes", key: "count", width: 20 },
        { header: "Total", key: "total", width: 16 },
        { header: "Observacoes", key: "notes", width: 40 },
        { header: "CriadoEm", key: "createdAt", width: 20 },
      ];
      filteredRequests.forEach((request) => sheet.addRow({
        id: request.id,
        technician: request.technician,
        count: request.receipts.length,
        total: request.total,
        notes: request.notes ?? "",
        createdAt: new Date(request.createdAt),
      }));

      const receiptsSheet = workbook.addWorksheet("Comprovantes");
      receiptsSheet.columns = [
        { header: "IdSolicitacao", key: "requestId", width: 24 },
        { header: "Tecnico", key: "technician", width: 34 },
        { header: "Arquivo", key: "fileName", width: 34 },
        { header: "Valor", key: "value", width: 14 },
      ];
      filteredRequests.forEach((request) => request.receipts.forEach((receipt) => receiptsSheet.addRow({
        requestId: request.id,
        technician: request.technician,
        fileName: receipt.fileName ?? "",
        value: receipt.value,
      })));

      [sheet, receiptsSheet].forEach((currentSheet) => {
        currentSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        currentSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3734B7" } };
        currentSheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: currentSheet.columnCount } };
        currentSheet.views = [{ state: "frozen", ySplit: 1 }];
      });
      const totalColumn = sheet.columns.find((column) => column.key === "total");
      if (totalColumn) totalColumn.numFmt = "R$ #,##0.00";
      const createdColumn = sheet.columns.find((column) => column.key === "createdAt");
      if (createdColumn) createdColumn.numFmt = "dd/mm/yyyy hh:mm";
      const valueColumn = receiptsSheet.columns.find((column) => column.key === "value");
      if (valueColumn) valueColumn.numFmt = "R$ #,##0.00";

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reembolsos-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <section className="page-heading">
        <span className="eyebrow">REEMBOLSOS</span>
        <h1>Solicitação de Reembolso</h1>
        <p>
          {isStaff
            ? "Acompanhe, filtre e exporte as solicitações de reembolso de todos os TSTs."
            : "Anexe os comprovantes de despesa e informe o valor de cada um."}
        </p>
      </section>

      {!isStaff && (
        <section className="panel reimbursement-form-panel">
          <div className="panel-header">
            <div><h2>Nova solicitação</h2><p>Adicione um comprovante por vez e informe o valor correspondente.</p></div>
          </div>
          {error && <div className="error-banner">{error}</div>}
          <div className="reimbursement-receipts">
            {receipts.map((receipt) => (
              <div className="reimbursement-receipt-row" key={receipt.id}>
                <img src={receipt.imageData} alt={receipt.fileName ?? "Comprovante"} />
                <div className="reimbursement-receipt-info">
                  <span>{receipt.fileName ?? "Comprovante"}</span>
                  <label>
                    <span>Valor (R$)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={receipt.value || ""}
                      onChange={(event) => updateReceiptValue(receipt.id, Number(event.target.value))}
                    />
                  </label>
                </div>
                <button type="button" onClick={() => removeReceipt(receipt.id)} aria-label="Remover comprovante"><Trash2 size={15} /></button>
              </div>
            ))}
            {!receipts.length && <div className="schedule-empty">Nenhum comprovante adicionado ainda.</div>}
          </div>
          <label className="button button-secondary reimbursement-upload">
            <Plus size={16} /> {processing ? "Processando..." : "Adicionar comprovante"}
            <input type="file" accept="image/*" onChange={addReceiptFromFile} disabled={processing} hidden />
          </label>
          <label className="field schedule-observation-field">
            <span>Observações (opcional)</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Detalhe o motivo ou contexto da despesa, se necessário." />
          </label>
          <div className="reimbursement-total"><span>Total da solicitação</span><strong>{currency(total)}</strong></div>
          <div className="form-actions">
            <button className="button button-primary" type="button" disabled={saving || !receipts.length} onClick={submit}>
              {saving ? "Enviando..." : "Enviar solicitação"}
            </button>
          </div>
        </section>
      )}

      {!isStaff && (
        <section className="panel">
          <div className="panel-header">
            <div><h2>Minhas solicitações</h2><p>Histórico das solicitações que você enviou.</p></div>
          </div>
          <div className="reimbursement-history-list">
            {myRequests.map((request) => (
              <button type="button" key={request.id} className="reimbursement-history-item" onClick={() => setSelectedRequest(request)}>
                <span>{formatDateTime(request.createdAt)}</span>
                <span>{request.receipts.length} comprovante(s)</span>
                <strong>{currency(request.total)}</strong>
              </button>
            ))}
            {!myRequests.length && (
              <div className="empty-state compact-empty"><Receipt size={24} /><strong>Nenhuma solicitação enviada</strong></div>
            )}
          </div>
        </section>
      )}

      {isStaff && (
        <>
          <section className="panel schedule-filter-panel">
            <label className="search-field">
              <Search size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar TST ou observação" />
            </label>
            <div className="schedule-filter-controls">
              <label>
                <span>TST</span>
                <select value={filters.technician} onChange={(event) => setFilters((current) => ({ ...current, technician: event.target.value }))}>
                  <option>Todos</option>
                  {settings.technicians.map((name) => <option key={name}>{name}</option>)}
                </select>
              </label>
              <label><span>De</span><input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} /></label>
              <label><span>Até</span><input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} /></label>
              <button className="button button-secondary" type="button" onClick={() => { setQuery(""); setFilters({ technician: "Todos", from: "", to: "" }); }}>Limpar filtros</button>
              <button className="button button-secondary" type="button" disabled={exporting || !filteredRequests.length} onClick={exportReimbursements}>
                <FileSpreadsheet size={16} /> {exporting ? "Exportando..." : "Exportar"}
              </button>
            </div>
            <span>{filteredRequests.length} solicitações · Total {currency(grandTotal)}</span>
          </section>

          <section className="panel schedule-table-panel">
            <div className="schedule-table-wrap">
              <table className="schedule-table">
                <thead>
                  <tr><th>TST</th><th>Data</th><th>Comprovantes</th><th>Total</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="schedule-table-row">
                      <td>{request.technician}</td>
                      <td>{formatDateTime(request.createdAt)}</td>
                      <td>{request.receipts.length}</td>
                      <td>{currency(request.total)}</td>
                      <td>
                        <button className="row-action" type="button" onClick={() => setSelectedRequest(request)}>
                          <Receipt size={13} /> Ver comprovantes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredRequests.length && <div className="schedule-empty">Nenhuma solicitação encontrada.</div>}
            </div>
          </section>
        </>
      )}

      {selectedRequest && (
        <div className="modal-backdrop">
          <section className="modal reimbursement-detail-modal">
            <div className="modal-header">
              <div><span className="eyebrow">DETALHES DA SOLICITAÇÃO</span><h2>{selectedRequest.technician}</h2></div>
              <button className="icon-button" onClick={() => setSelectedRequest(null)}><X size={20} /></button>
            </div>
            <p>{formatDateTime(selectedRequest.createdAt)}</p>
            {selectedRequest.notes && <p>{selectedRequest.notes}</p>}
            <div className="reimbursement-receipts">
              {selectedRequest.receipts.map((receipt) => (
                <div className="reimbursement-receipt-row" key={receipt.id}>
                  <img src={receipt.imageData} alt={receipt.fileName ?? "Comprovante"} />
                  <div className="reimbursement-receipt-info">
                    <span>{receipt.fileName ?? "Comprovante"}</span>
                    <strong>{currency(receipt.value)}</strong>
                  </div>
                </div>
              ))}
            </div>
            <div className="reimbursement-total"><span>Total</span><strong>{currency(selectedRequest.total)}</strong></div>
            <div className="form-actions">
              <button className="button button-secondary" onClick={() => setSelectedRequest(null)}>Fechar</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
