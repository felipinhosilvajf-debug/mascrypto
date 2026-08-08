import { nivelPorXp } from "./economia";

export const TEMAS = [
  { id: "neon", nome: "Neon Tokyo", classe: "from-fuchsia-600/40 via-indigo-800/40 to-slate-950" },
  { id: "floresta", nome: "Selva Verde", classe: "from-emerald-600/40 via-teal-800/40 to-slate-950" },
  { id: "praia", nome: "Praia Dourada", classe: "from-amber-500/40 via-orange-700/40 to-slate-950" },
  { id: "espaco", nome: "Espaço Profundo", classe: "from-indigo-700/40 via-purple-900/40 to-black" },
  { id: "sangue", nome: "Bull Vermelho", classe: "from-rose-600/40 via-red-900/40 to-slate-950" },
  { id: "gelo", nome: "Ártico Cyber", classe: "from-cyan-500/40 via-sky-800/40 to-slate-950" },
];

export const AVATARES = ["🦊", "🐻", "🐼", "🐸", "🦁", "🐧", "🐳", "🦄", "👽", "🤠", "🧙", "🥷", "🐺", "🦉", "🐲", "🦈"];

export const STATUS_QUARTO = [
  "Patrulhando as Rigs",
  "Minerando em silêncio",
  "Analisando gráficos",
  "Contando MAS",
  "Esperando o pump",
  "Apostando no Crash",
  "Dormindo no lucro",
  "Caçando airdrops",
];

/** Slots de equipamento — usados pelo inventário e pelo avatar do quarto. */
export const SLOTS: { id: string; nome: string; emoji: string }[] = [
  { id: "chapeu", nome: "Chapéu", emoji: "🎩" },
  { id: "oculos", nome: "Óculos", emoji: "🕶️" },
  { id: "camisa", nome: "Camisa", emoji: "👕" },
  { id: "calca", nome: "Calça", emoji: "👖" },
  { id: "sapato", nome: "Sapato", emoji: "👟" },
  { id: "gpu", nome: "Placa de vídeo", emoji: "🖥️" },
  { id: "periferico", nome: "Periférico", emoji: "🖱️" },
  { id: "pet", nome: "Companheiro", emoji: "🧩" },
];

export interface Transacao {
  t: string;
  v: number;
  d: string;
  ts: number;
  moeda?: "MAS" | "BRL";
}

export interface UserData {
  uid: string;
  nome: string;
  email: string;
  avatar: string;
  status: string;
  saldo: number; // MAS
  brl: number;
  xp: number;
  nivel: number; // sempre derivado de xp via nivelPorXp()
  rigs: Record<string, number>;
  itens: string[]; // inventário (ids do catálogo)
  equipados: Record<string, string>; // slot -> itemId
  tema: string;
  quarto: Record<string, { x: number; y: number }>;
  ultimaColeta: number;
  ultimoLogin: string;
  streak: number;
  totalMinerado: number;
  cliquesMinerados: number;
  apostas: number;
  vitorias: number;
  maiorGanho: number;
  historico: Transacao[];
  conquistas: string[];
  criadoEm: number;
  admin: boolean;
  banido: boolean;
  /** Incrementado pelo Admin — força o cliente a adotar os dados remotos. */
  adminRev: number;
  atualizadoEm: number;
}

export function novoUsuario(uid: string, nome: string, email: string): UserData {
  return {
    uid,
    nome,
    email,
    avatar: "🦊",
    status: "Patrulhando as Rigs",
    saldo: 500,
    brl: 0,
    xp: 0,
    nivel: 1,
    rigs: { cpu: 1 },
    itens: [],
    equipados: {},
    tema: "neon",
    quarto: {},
    ultimaColeta: Date.now(),
    ultimoLogin: "",
    streak: 0,
    totalMinerado: 0,
    cliquesMinerados: 0,
    apostas: 0,
    vitorias: 0,
    maiorGanho: 0,
    historico: [],
    conquistas: [],
    criadoEm: Date.now(),
    admin: false,
    banido: false,
    adminRev: 0,
    atualizadoEm: Date.now(),
  };
}

/** IDs do catálogo antigo → novo (mantém o inventário de contas antigas). */
const MIGRAR_ITENS: Record<string, string> = {
  oculos: "oculos_cyber",
  setup: "gpu_3060",
  relogio: "quadro",
};

/** Normaliza um documento vindo do banco/localStorage (migração segura). */
export function normalizar(bruto: Partial<UserData>, uid: string): UserData {
  const base = novoUsuario(uid, bruto.nome || "Anônimo", bruto.email || "");
  const d: UserData = { ...base, ...bruto, uid } as UserData;
  d.itens = Array.isArray(d.itens)
    ? Array.from(new Set(d.itens.map((i) => MIGRAR_ITENS[i] || i)))
    : [];
  d.equipados = d.equipados && typeof d.equipados === "object" ? d.equipados : {};
  d.rigs = d.rigs && typeof d.rigs === "object" ? d.rigs : {};
  d.quarto = d.quarto && typeof d.quarto === "object" ? d.quarto : {};
  d.historico = Array.isArray(d.historico) ? d.historico : [];
  d.conquistas = Array.isArray(d.conquistas) ? d.conquistas : [];
  d.saldo = Number(d.saldo) || 0;
  d.brl = Number(d.brl) || 0;
  d.xp = Math.max(0, Number(d.xp) || 0);
  d.nivel = nivelPorXp(d.xp); // nível SEMPRE derivado do XP
  return d;
}

export const CONQUISTAS = [
  { id: "primeiro", nome: "Primeiros Passos", emoji: "👣", desc: "Crie sua conta", premio: 100 },
  { id: "minerador", nome: "Minerador", emoji: "⛏️", desc: "Minere 1.000 MAS", premio: 250 },
  { id: "baleia", nome: "Baleia", emoji: "🐳", desc: "Tenha 100.000 MAS", premio: 5000 },
  { id: "sortudo", nome: "Sortudo", emoji: "🍀", desc: "Ganhe 10 apostas", premio: 500 },
  { id: "highroller", nome: "High Roller", emoji: "💎", desc: "Ganhe 10.000 MAS numa aposta", premio: 2000 },
  { id: "fiel", nome: "Fiel", emoji: "📅", desc: "7 dias de login seguidos", premio: 1500 },
  { id: "decorador", nome: "Decorador", emoji: "🏠", desc: "Possua 5 itens", premio: 800 },
  { id: "fashion", nome: "Fashionista", emoji: "🕶️", desc: "Equipe 4 peças de roupa", premio: 1200 },
  { id: "clicker", nome: "Dedo de Ouro", emoji: "🖱️", desc: "1.000 cliques minerados", premio: 900 },
];
