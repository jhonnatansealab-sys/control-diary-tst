import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { dataUrlToBlobUrl, downloadDataUrl, type ReportPayload } from "../lib/reportFile";

export function ReportViewerModal({ report, onClose }: { report: ReportPayload; onClose: () => void }) {
  const [pdfUrl, setPdfUrl] = useState("");
  const isPdf = report.mimeType === "application/pdf";
  const isImage = report.mimeType.startsWith("image/");

  useEffect(() => {
    if (!isPdf) return;
    let url = "";
    let cancelled = false;
    dataUrlToBlobUrl(report.dataUrl).then((created) => {
      url = created;
      if (cancelled) URL.revokeObjectURL(created);
      else setPdfUrl(created);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [isPdf, report.dataUrl]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal reimbursement-viewer-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div><span className="eyebrow">RELATÓRIO DE ATIVIDADES</span><h2>{report.fileName}</h2></div>
          <button className="icon-button" type="button" onClick={onClose}><X size={20} /></button>
        </div>
        {isImage && <img className="reimbursement-viewer-image" src={report.dataUrl} alt={report.fileName} />}
        {isPdf && (pdfUrl ? <iframe className="report-viewer-frame" src={pdfUrl} title={report.fileName} /> : <p>Carregando...</p>)}
        {!isImage && !isPdf && <p>A pré-visualização não está disponível para arquivos Word. Use o botão Baixar.</p>}
        <div className="form-actions">
          <button className="button button-secondary" type="button" onClick={() => downloadDataUrl(report.fileName, report.dataUrl)}>
            <Download size={16} /> Baixar
          </button>
          <button className="button button-secondary" type="button" onClick={onClose}>Fechar</button>
        </div>
      </section>
    </div>
  );
}
