import { readFileSync } from "node:fs";

const files = {
  app: readFileSync("src/App.tsx", "utf8"),
  layout: readFileSync("src/components/Layout.tsx", "utf8"),
  schedule: readFileSync("src/pages/Schedule.tsx", "utf8"),
  api: readFileSync("src/lib/api.ts", "utf8"),
  types: readFileSync("src/types.ts", "utf8"),
  edge: readFileSync("supabase/functions/diary-api/index.ts", "utf8"),
  migration: readFileSync("supabase/migrations/20260918102000_create_schedule_records.sql", "utf8"),
};

const required = [
  ["src/App.tsx", /path="\/programacao"/],
  ["src/components/Layout.tsx", /Programacao/],
  ["src/pages/Schedule.tsx", /Agendamento de Programação/],
  ["src/pages/Schedule.tsx", /Nova Programação/],
  ["src/pages/Schedule.tsx", /schedule-filter-panel/],
  ["src/pages/Schedule.tsx", /schedule-board-full/],
  ["src/pages/Schedule.tsx", /compact-schedule-card/],
  ["src/pages/Schedule.tsx", /ScheduleDetailsModal/],
  ["src/pages/Schedule.tsx", /ScheduleFormModal/],
  ["src/pages/Schedule.tsx", /TSTs diurnos/],
  ["src/pages/Schedule.tsx", /TSTs noturnos/],
  ["src/pages/Schedule.tsx", /Suporte da CBO/],
  ["src/pages/Schedule.tsx", /Número da OS/],
  ["src/pages/Schedule.tsx", /Data da solicitação/],
  ["src/pages/Schedule.tsx", /Editar/],
  ["src/pages/Schedule.tsx", /DOC&CON/],
  ["src/pages/Schedule.tsx", /Programado/],
  ["src/pages/Schedule.tsx", /\(21\) 99999-9999/],
  ["src/App.tsx", /onUpdate=\{updateScheduleRecord\}/],
  ["src/lib/api.ts", /createRemoteScheduleRecord/],
  ["src/lib/api.ts", /updateRemoteScheduleRecord/],
  ["src/lib/api.ts", /updateRemoteScheduleStatus/],
  ["src/types.ts", /ScheduleRecord/],
  ["supabase/functions/diary-api/index.ts", /action === "schedule"/],
  ["supabase/functions/diary-api/index.ts", /request\.method === "PATCH" && action === "schedule"/],
  ["supabase/functions/diary-api/index.ts", /app_schedule_records/],
  ["supabase/migrations/20260918102000_create_schedule_records.sql", /create table if not exists public\.app_schedule_records/],
];

const failures = required.filter(([file, pattern]) => !pattern.test(files[
  file.includes("App") ? "app"
    : file.includes("Layout") ? "layout"
      : file.includes("Schedule.tsx") ? "schedule"
        : file.includes("api.ts") ? "api"
          : file.includes("types.ts") ? "types"
            : file.includes("diary-api") ? "edge"
              : "migration"
]));

if (failures.length) {
  throw new Error(
    `Programacao de agendamento incompleta: ${failures
      .map(([file, pattern]) => `${file} ${pattern}`)
      .join(", ")}`,
  );
}

console.log("Programacao de agendamento com rota, Kanban, API e migration.");
