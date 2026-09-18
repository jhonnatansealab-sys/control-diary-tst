import { readFileSync } from "node:fs";

const analytics = readFileSync("src/pages/Analytics.tsx", "utf8");
const layout = readFileSync("src/components/Layout.tsx", "utf8");

const forbidden = [
  ["src/pages/Analytics.tsx", /\bPower BI\b/],
  ["src/pages/Analytics.tsx", /\bBI\b/],
  ["src/pages/Analytics.tsx", /modelo-power-bi/],
  ["src/pages/Analytics.tsx", /fato-atividades-power-bi/],
  ["src/components/Layout.tsx", /\bBI\b/],
];

const required = [
  ["src/pages/Analytics.tsx", /Exportar relatorio/],
  ["src/pages/Analytics.tsx", /relatorio-metricas-tst/],
  ["src/pages/Analytics.tsx", /await import\("exceljs"\)/],
  ["src/pages/Analytics.tsx", /filteredFacts\.forEach/],
  ["src/pages/Analytics.tsx", /filteredRecords\.forEach/],
];

const files = { "src/pages/Analytics.tsx": analytics, "src/components/Layout.tsx": layout };

const forbiddenFailures = forbidden.filter(([file, pattern]) => pattern.test(files[file]));
const requiredFailures = required.filter(([file, pattern]) => !pattern.test(files[file]));

if (forbiddenFailures.length || requiredFailures.length) {
  throw new Error([
    forbiddenFailures.length
      ? `Referencias indevidas encontradas: ${forbiddenFailures.map(([file, pattern]) => `${file} ${pattern}`).join(", ")}`
      : "",
    requiredFailures.length
      ? `Exportacao filtrada incompleta: ${requiredFailures.map(([file, pattern]) => `${file} ${pattern}`).join(", ")}`
      : "",
  ].filter(Boolean).join(" | "));
}

console.log("Tela de metricas com exportacao filtrada e sem referencias de BI.");
