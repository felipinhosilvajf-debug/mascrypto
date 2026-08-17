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
  "Ativando a Ring",
  "Minerando em silêncio",
  "Analisando gráficos",
  "Contando MAS",
  "Esperando o pump",
  "Apostando no Crash",
  "Dormindo no lucro",
  "Caçando airdrops",
];

/**
 * SLOTS RPG — aparência do avatar (SOMENTE roupas, chapéus, acessórios vestíveis e pets).
 * Placas de vídeo e periféricos de mineração NÃO entram aqui — vão para os slots do quarto.
 */
export const SLOTS_RPG: { id: string; nome: string; emoji: string }[] = [
  /* Sistema simplificado: o jogador equipa somente Avatares Inteiros (skins).
     Este array permanece para compatibilidade, mas NÃO há itens de vestuário. */
];

/**
 * SLOTS HARDWARE — posicionados no quarto; geram Hashrate.
 * Cada slot ativo soma H/s ao cálculo global.
 */
export const SLOTS_HARDWARE: { id: string; nome: string; emoji: string }[] = [
  { id: "gpu",       nome: "Placa de vídeo", emoji: "🖥️" },
  { id: "periferico", nome: "Periférico",    emoji: "🖱️" },
];

/** LEGADO — exportado para componentes que ainda usam "SLOTS" diretamente. */
export const SLOTS = [...SLOTS_RPG, ...SLOTS_HARDWARE];

export interface Transacao {
  t: string;
  v: number;
  d: string;
  ts: number;
  moeda?: "MAS" | "BRL";
}

/** Saldo creditado UMA ÚNICA VEZ na criação do documento do usuário. */
export const SALDO_INICIAL_MAS = 10;

export interface UserData {
  uid: string;
  nome: string;
  email: string;
  avatar: string;
  /** URL/dataURL opcional para sprite customizado do personagem. */
  avatarImg?: string;
  status: string;
  saldo: number; // MAS
  brl: number;
  xp: number;
  nivel: number; // sempre derivado de xp via nivelPorXp()
  itens: string[]; // inventário (ids do catálogo)
  equipados: Record<string, string>; // slot -> itemId
  tema: string;
  /** Cores personalizadas do ambiente do quarto (definidas somente pelo anfitrião). */
  quartoFundo: string;
  quartoPiso: string;
  /** Textura do piso selecionada pelo anfitrião. */
  quartoTextura: "grid" | "madeira" | "metal" | "liso";
  quarto: Record<string, { x: number; y: number }>;
  avatarPos: { x: number; y: number };
  lastMsg?: string;
  lastMsgTs?: number;
  ultimaColeta: number;
  /** Data (YYYY-MM-DD) do último resgate diário — validado no servidor. */
  lastDailyClaim: string;
  /** Dias consecutivos de resgate. */
  streakDays: number;
  totalMinerado: number;
  cliquesMinerados: number;
  apostas: number;
  vitorias: number;
  maiorGanho: number;
  historico: Transacao[];
  conquistas: string[];
  criadoEm: number;
  admin: boolean;
  moderador: boolean;
  banido: boolean;
  /** Versão dos Termos de Uso aceita pelo usuário. */
  termosVersao?: string;
  /** Data/hora (ms) do aceite dos Termos de Uso. */
  termosAceitosEm?: number;
  /** Quarto aberto para visitas de outros jogadores. */
  quartoAberto?: boolean;
  /**
   * Slots de hardware do quarto (GPUs/periféricos colocados na fazenda do quarto).
   * Chave = ID do item, valor = índice do slot (0-based).
   */
  slotsHardware: Record<string, number>;
  /** Capacidade atual de slots de hardware comprados pelo usuário. */
  capacidadeSlotsHardware: number;
  /** Incrementado pelo Admin — força o cliente a adotar os dados remotos. */
  adminRev: number;
  atualizadoEm: number;
}

export function novoUsuario(uid: string, nome: string, email: string, saldoInicial = SALDO_INICIAL_MAS): UserData {
  return {
    uid,
    nome,
    email,
    avatar: "🦊",
    avatarImg: "",
    status: "Ativando a Ring",
    saldo: saldoInicial,
    brl: 0,
    xp: 0,
    nivel: 1,
    itens: [],
    equipados: {},
    tema: "neon",
    quartoFundo: "#111827",
    quartoPiso: "#172033",
    quartoTextura: "grid",
    quarto: {},
    avatarPos: { x: 4, y: 3 },
    slotsHardware: {},
    capacidadeSlotsHardware: 4,
    ultimaColeta: Date.now(),
    lastDailyClaim: "",
    streakDays: 0,
    totalMinerado: 0,
    cliquesMinerados: 0,
    apostas: 0,
    vitorias: 0,
    maiorGanho: 0,
    historico: [],
    conquistas: [],
    criadoEm: Date.now(),
    admin: false,
    moderador: false,
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

/** Normaliza um documento vindo do Firestore (migração segura de versões antigas). */
export function normalizar(bruto: Partial<UserData>, uid: string): UserData {
  const base = novoUsuario(uid, bruto.nome || "Anônimo", bruto.email || "");
  const legado = bruto as Partial<UserData> & { ultimoLogin?: string; streak?: number };
  const d: UserData = { ...base, ...bruto, uid } as UserData;
  // migração dos campos antigos de recompensa diária
  if (!d.lastDailyClaim && legado.ultimoLogin) d.lastDailyClaim = legado.ultimoLogin;
  if (!d.streakDays && typeof legado.streak === "number") d.streakDays = legado.streak;
  d.lastDailyClaim = d.lastDailyClaim || "";
  d.streakDays = Math.max(0, Number(d.streakDays) || 0);
  d.itens = Array.isArray(d.itens)
    ? Array.from(new Set(d.itens.map((i) => MIGRAR_ITENS[i] || i)))
    : [];
  d.equipados = d.equipados && typeof d.equipados === "object" ? d.equipados : {};
  d.quarto = d.quarto && typeof d.quarto === "object" ? d.quarto : {};
  d.quartoFundo = typeof d.quartoFundo === "string" && d.quartoFundo ? d.quartoFundo : "#111827";
  d.quartoPiso = typeof d.quartoPiso === "string" && d.quartoPiso ? d.quartoPiso : "#172033";
  d.quartoTextura = ["grid", "madeira", "metal", "liso"].includes(d.quartoTextura)
    ? d.quartoTextura
    : "grid";
  d.slotsHardware = (d as any).slotsHardware && typeof (d as any).slotsHardware === "object"
    ? (d as any).slotsHardware
    : {};
  d.capacidadeSlotsHardware = Math.max(4, Number((d as any).capacidadeSlotsHardware) || 4);
  d.avatarPos = d.avatarPos && typeof d.avatarPos.x === "number" && typeof d.avatarPos.y === "number"
    ? d.avatarPos
    : { x: 4, y: 3 };
  d.historico = Array.isArray(d.historico) ? d.historico : [];
  d.conquistas = Array.isArray(d.conquistas) ? d.conquistas : [];
  d.saldo = Number(d.saldo) || 0;
  d.brl = Number(d.brl) || 0;
  d.avatarImg = typeof d.avatarImg === "string" ? d.avatarImg : "";
  d.moderador = !!(d as any).moderador;
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
