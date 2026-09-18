import { readFileSync } from "node:fs";

const files = {
  analytics: readFileSync("src/pages/Analytics.tsx", "utf8"),
  layout: readFileSync("src/components/Layout.tsx", "utf8"),
};

const forbidden = [
  ["src/pages/Analytics.tsx", /\bPower BI\b/],
  ["src/pages/Analytics.tsx", /\bCSV\b/],
  ["src/pages/Analytics.tsx", /Exportar/],
  ["src/pages/Analytics.tsx", /downloadBlob/],
  ["src/pages/Analytics.tsx", /toCsv/],
  ["src/pages/Analytics.tsx", /exceljs/],
  ["src/components/Layout.tsx", /\bBI\b/],
];

const failures = forbidden.filter(([file, pattern]) => pattern.test(files[file === "src/pages/Analytics.tsx" ? "analytics" : "layout"]));

if (failures.length) {
  throw new Error(
    `A tela de metricas ainda contem referencias de BI/exportacao: ${failures
      .map(([file, pattern]) => `${file} ${pattern}`)
      .join(", ")}`,
  );
}

console.log("Tela de metricas sem referencias de BI/exportacao.");
