import type { DiaryRecord, EditRequest, SystemSettings } from "./types";

export const initialTechnicians = [
  "Arthur Muller",
  "Bruno Lima Cardoso de Oliveira",
  "Caio Guerreiro de Oliveira",
  "Carolina dos Anjos Cunha",
  "Cleyton Henrique Rodrigues Costa",
  "Daniel da Silva Drumond",
  "Ernani Michel Lima Cardoso de Oliveira",
  "Fabiano de Souza Correaia",
  "Fábio de Souza",
  "Felipe de Araújo Paz",
  "Felipi Silmplício de Oliveira",
  "Horlan da Silva Gonçalves",
  "Jairo Marcelo Rodrigues",
  "João Paulo dos Santos Filho",
  "Joyce de Oliveira Leite",
  "Lais Maria de Oliveira",
  "Lamaier Rodrigues Ribeiro",
  "Larissa Cristina de Almeida Rodrigues",
  "Leandro da Silva da Costa",
  "Lucas do Nascimento dos Santos",
  "Marcelo Diniz Quadros",
  "Marcos da Silva Damazio",
  "Marcos Vinicius Nunes Almeida",
  "Marcus Vinicius Nogueira Silva",
  "Mary Ellen Santana",
  "Matheus Alves Tavares",
  "Matheus Loyola Araujo",
  "Matheus Souza Ribeiro",
  "Maurício Cabral",
  "Paulo André Vidal Fernandes",
  "Pedro Schenkel Assunção Natário",
  "Rafael de Paula da Silva",
  "Ricardo Elias Antunes de Araújo",
  "Stephanie Barros Oliveira",
  "Thiago Pacheco Brito",
  "Thiago Vinícius Matos Mesquita",
  "Victor da Silva Souza",
];

export const initialVessels = [
  "HOSS BRASS RING",
  "SIEM PILOT",
  "SKANDI AMAZONAS",
  "SKANDI CARLA",
  "SKANDI COMMANDER",
  "SKANDI PARATY",
];

export const demoRecords: DiaryRecord[] = [
  {
    id: "REG-0710",
    date: "2026-06-11",
    technician: "Leandro da Silva da Costa",
    turns: [
      {
        shift: "Diurno",
        activity: "Area",
        vessels: ["HOSS BRASS RING"],
      },
    ],
    notes: "Acompanhamento de atividade operacional.",
    status: "Registrado",
    createdAt: "2026-06-11T08:12:00",
  },
  {
    id: "REG-0709",
    date: "2026-06-10",
    technician: "Leandro da Silva da Costa",
    turns: [
      {
        shift: "Diurno",
        activity: "Area",
        vessels: ["SKANDI PARATY"],
      },
      {
        shift: "Noturno",
        activity: "ADM",
        vessels: ["SKANDI CARLA"],
      },
    ],
    notes: "Dobra autorizada pela supervisao.",
    status: "Solicitacao enviada",
    createdAt: "2026-06-10T19:35:00",
  },
  {
    id: "REG-0708",
    date: "2026-06-09",
    technician: "Joyce de Oliveira Leite",
    turns: [
      {
        shift: "Noturno",
        activity: "Area",
        vessels: ["SKANDI COMMANDER"],
      },
    ],
    notes: "",
    status: "Registrado",
    createdAt: "2026-06-09T18:02:00",
  },
];

export const demoRequests: EditRequest[] = [
  {
    id: "SOL-0031",
    recordId: "REG-0709",
    technician: "Leandro da Silva da Costa",
    date: "2026-06-10",
    reason: "Embarcacao informada incorretamente no segundo turno.",
    originalRecord: demoRecords[1],
    proposedRecord: {
      ...demoRecords[1],
      turns: [
        demoRecords[1].turns[0],
        { ...demoRecords[1].turns[1], vessels: ["SKANDI COMMANDER"] },
      ],
    },
    status: "Pendente",
    createdAt: "2026-06-11T09:10:00",
  },
];

export const defaultSettings: SystemSettings = {
  technicians: initialTechnicians,
  vessels: initialVessels,
  accessAccounts: [
    {
      id: "access-admin",
      role: "admin",
      name: "Administrador",
      username: "admin",
      password: "Muniz@2026",
      active: true,
    },
    {
      id: "access-supervisor",
      role: "supervisor",
      name: "Coordenador",
      username: "Coordenador",
      password: "Martins@2026",
      active: true,
    },
    {
      id: "access-financeiro",
      role: "financeiro",
      name: "Financeiro",
      username: "Financeiro",
      password: "Sea@2026@",
      active: true,
    },
  ],
  allowSelfieDeletion: false,
};
