export const REPORT_MAX_BYTES = 2 * 1024 * 1024;
export const REPORT_ACCEPT = ".jpg,.jpeg,.png,.pdf,.doc,.docx";

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export interface ReportPayload {
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isViewableReport(mimeType: string) {
  return mimeType.startsWith("image/") || mimeType === "application/pdf";
}

export async function readReportFile(file: File): Promise<ReportPayload> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = MIME_BY_EXTENSION[extension];
  if (!mimeType) throw new Error("Formato não permitido. Use JPG, PNG, PDF, DOC ou DOCX.");
  if (file.size > REPORT_MAX_BYTES) throw new Error("O arquivo excede o limite de 2 MB.");
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
  const base64 = source.slice(source.indexOf(",") + 1);
  return { fileName: file.name, mimeType, size: file.size, dataUrl: `data:${mimeType};base64,${base64}` };
}

export function downloadDataUrl(fileName: string, dataUrl: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  link.click();
}

export async function dataUrlToBlobUrl(dataUrl: string) {
  const blob = await (await fetch(dataUrl)).blob();
  return URL.createObjectURL(blob);
}
