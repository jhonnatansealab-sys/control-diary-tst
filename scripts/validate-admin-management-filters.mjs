import { readFileSync } from "node:fs";

const admin = readFileSync("src/pages/Admin.tsx", "utf8");
const styles = readFileSync("src/styles.css", "utf8");

const required = [
  ["src/pages/Admin.tsx", /normalizeSearch/],
  ["src/pages/Admin.tsx", /managementSearch/],
  ["src/pages/Admin.tsx", /managementFilter/],
  ["src/pages/Admin.tsx", /filteredCatalog/],
  ["src/pages/Admin.tsx", /filteredAccounts/],
  ["src/pages/Admin.tsx", /Barra de pesquisa/],
  ["src/pages/Admin.tsx", /Possiveis duplicados/],
  ["src/pages/Admin.tsx", /Nenhum item encontrado/],
  ["src/styles.css", /\.management-tools/],
  ["src/styles.css", /\.management-results-summary/],
];

const files = { "src/pages/Admin.tsx": admin, "src/styles.css": styles };
const failures = required.filter(([file, pattern]) => !pattern.test(files[file]));

if (failures.length) {
  throw new Error(
    `Busca/filtro da administracao incompletos: ${failures
      .map(([file, pattern]) => `${file} ${pattern}`)
      .join(", ")}`,
  );
}

console.log("Administracao com busca e filtros nas listas gerenciaveis.");
