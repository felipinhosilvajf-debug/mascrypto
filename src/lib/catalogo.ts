/* ============================================================
   CATÁLOGO GLOBAL — itens da loja, rigs, jogos e mineração.
   Estes são apenas os PADRÕES: o Admin pode criar, editar e
   excluir tudo em tempo real (ver src/store/ConfigContext.tsx).
   ============================================================ */

export type Categoria =
  | "camisa"
  | "calca"
  | "sapato"
  | "chapeu"
  | "oculos"
  | "movel"
  | "gpu"
  | "periferico"
  | "outro";

export const CATEGORIAS: {
  id: Categoria;
  nome: string;
  emoji: string;
  slot: string | null;
  geraHS: boolean;
}[] = [
  { id: "camisa", nome: "Camisas", emoji: "👕", slot: "camisa", geraHS: false },
  { id: "calca", nome: "Calças", emoji: "👖", slot: "calca", geraHS: false },
  { id: "sapato", nome: "Sapatos", emoji: "👟", slot: "sapato", geraHS: false },
  { id: "chapeu", nome: "Chapéus", emoji: "🎩", slot: "chapeu", geraHS: false },
  { id: "oculos", nome: "Óculos", emoji: "🕶️", slot: "oculos", geraHS: false },
  { id: "movel", nome: "Móveis", emoji: "🪑", slot: null, geraHS: false },
  { id: "gpu", nome: "Placas de vídeo", emoji: "🖥️", slot: "gpu", geraHS: true },
  { id: "periferico", nome: "Periféricos", emoji: "🖱️", slot: "periferico", geraHS: true },
  { id: "outro", nome: "Outros acessórios", emoji: "🧩", slot: "pet", geraHS: true },
];

export const GRUPOS_ADMIN: { id: string; nome: string; cats: Categoria[] }[] = [
  { id: "roupas", nome: "👕 Roupas", cats: ["camisa", "calca", "sapato"] },
  { id: "acessorios", nome: "🎩 Acessórios", cats: ["chapeu", "oculos"] },
  { id: "gpus", nome: "🖥️ Placas de vídeo", cats: ["gpu"] },
  { id: "moveis", nome: "🪑 Móveis", cats: ["movel"] },
  { id: "perifericos", nome: "🖱️ Periféricos", cats: ["periferico"] },
  { id: "outros", nome: "🧩 Outros", cats: ["outro"] },
];

export function infoCategoria(c: Categoria) {
  return CATEGORIAS.find((x) => x.id === c) || CATEGORIAS[CATEGORIAS.length - 1];
}

export interface ItemLoja {
  id: string;
  nome: string;
  desc: string;
  categoria: Categoria;
  emoji: string;
  /** URL de imagem PNG (opcional). Se vazio usa o emoji. */
  imagem: string;
  preco: number;
  nivelMin: number;
  /** Hashrate gerado quando equipado (0 para roupas). */
  hs: number;
  /** Bônus percentual de mineração (ex.: 0.05 = +5%). */
  bonusPct: number;
  ativo: boolean;
  /** Estoque: -1 = ilimitado. */
  estoque: number;
  /** Requisito extra em texto livre, exibido na loja. */
  requisito: string;
  /** Slot de equipamento (derivado da categoria, sobrescrevível). */
  slot: string | null;
  /** Pode ser posicionado no quarto virtual. */
  decorativo: boolean;
}

const mk = (p: Partial<ItemLoja> & { id: string; nome: string; categoria: Categoria; preco: number; emoji: string }): ItemLoja => {
  const info = infoCategoria(p.categoria);
  return {
    desc: "",
    imagem: "",
    nivelMin: 1,
    hs: 0,
    bonusPct: 0,
    ativo: true,
    estoque: -1,
    requisito: "",
    slot: info.slot,
    decorativo: p.categoria === "movel",
    ...p,
  } as ItemLoja;
};

export const ITENS_PADRAO: ItemLoja[] = [
  // ---------- CAMISAS ----------
  mk({ id: "camisa_hodl", nome: "Camiseta HODL", categoria: "camisa", emoji: "👕", preco: 350, nivelMin: 1, desc: "Algodão premium com estampa HODL." }),
  mk({ id: "camisa_neon", nome: "Jaqueta Neon", categoria: "camisa", emoji: "🧥", preco: 2400, nivelMin: 6, desc: "Jaqueta cyberpunk com fios de LED." }),
  mk({ id: "camisa_terno", nome: "Terno do Magnata", categoria: "camisa", emoji: "🤵", preco: 18000, nivelMin: 20, desc: "Alfaiataria para grandes investidores." }),
  // ---------- CALÇAS ----------
  mk({ id: "calca_jeans", nome: "Jeans do Minerador", categoria: "calca", emoji: "👖", preco: 420, nivelMin: 1, desc: "Resistente à poeira das rigs." }),
  mk({ id: "calca_tatica", nome: "Calça Tática Cyber", categoria: "calca", emoji: "🥾", preco: 3100, nivelMin: 9, desc: "Bolsos para cold wallets." }),
  // ---------- SAPATOS ----------
  mk({ id: "tenis_hash", nome: "Tênis HashRunner", categoria: "sapato", emoji: "👟", preco: 900, nivelMin: 3, desc: "Corre mais rápido que o mercado." }),
  mk({ id: "bota_lunar", nome: "Bota Lunar", categoria: "sapato", emoji: "🥿", preco: 7600, nivelMin: 15, desc: "Feita para pisar na Lua. 🌕" }),
  // ---------- CHAPÉUS ----------
  mk({ id: "bone_mas", nome: "Boné MAS", categoria: "chapeu", emoji: "🧢", preco: 300, nivelMin: 1, desc: "O clássico boné da rede." }),
  mk({ id: "coroa", nome: "Coroa da Baleia", categoria: "chapeu", emoji: "👑", preco: 50000, nivelMin: 30, desc: "Só para quem move o mercado." }),
  mk({ id: "cartola", nome: "Cartola do Cassino", categoria: "chapeu", emoji: "🎩", preco: 6200, nivelMin: 12, desc: "Sorte e elegância." }),
  // ---------- ÓCULOS ----------
  mk({ id: "oculos_cyber", nome: "Óculos Cyber", categoria: "oculos", emoji: "🕶️", preco: 1500, nivelMin: 4, desc: "Enxergue os candles em 4D." }),
  mk({ id: "oculos_vr", nome: "Visor VR MAS", categoria: "oculos", emoji: "🥽", preco: 9800, nivelMin: 18, desc: "Metaverso da rede MAS." }),
  // ---------- MÓVEIS ----------
  mk({ id: "sofa", nome: "Sofá Neon", categoria: "movel", emoji: "🛋️", preco: 400, desc: "Conforto para longas sessões." }),
  mk({ id: "cama", nome: "Cama Cripto", categoria: "movel", emoji: "🛏️", preco: 650, desc: "Sonhos com velas verdes." }),
  mk({ id: "planta", nome: "Planta da Sorte", categoria: "movel", emoji: "🪴", preco: 200, desc: "Verde como o gráfico ideal." }),
  mk({ id: "tv", nome: "TV Ultra 8K", categoria: "movel", emoji: "📺", preco: 1200, nivelMin: 3, desc: "Acompanhe o mercado em 8K." }),
  mk({ id: "cofre", nome: "Cofre Blindado", categoria: "movel", emoji: "🔐", preco: 5000, nivelMin: 8, desc: "Guarde suas chaves privadas." }),
  mk({ id: "quadro", nome: "NFT Emoldurado", categoria: "movel", emoji: "🖼️", preco: 3200, nivelMin: 5, desc: "Arte digital rara na parede." }),
  mk({ id: "janela", nome: "Janela Panorâmica", categoria: "movel", emoji: "🪟", preco: 1800, nivelMin: 4, desc: "Vista direta para a Lua." }),
  mk({ id: "foguete", nome: "Foguete Decorativo", categoria: "movel", emoji: "🚀", preco: 15000, nivelMin: 16, desc: "To the moon, literalmente." }),
  // ---------- PLACAS DE VÍDEO (H/S) ----------
  mk({ id: "gpu_1050", nome: "MAS GTX 1050", categoria: "gpu", emoji: "🎮", preco: 1500, nivelMin: 2, hs: 0.35, desc: "Primeira placa de todo minerador." }),
  mk({ id: "gpu_3060", nome: "MAS RTX 3060", categoria: "gpu", emoji: "🖥️", preco: 7800, nivelMin: 7, hs: 1.8, desc: "Custo-benefício da mineração." }),
  mk({ id: "gpu_4090", nome: "MAS RTX 4090 Ti", categoria: "gpu", emoji: "💽", preco: 42000, nivelMin: 16, hs: 9.5, desc: "Monstro de hashrate doméstico." }),
  mk({ id: "gpu_quantum", nome: "Placa Quântica X", categoria: "gpu", emoji: "🧊", preco: 260000, nivelMin: 28, hs: 48, desc: "Qubits minerando por você." }),
  // ---------- PERIFÉRICOS (H/S) ----------
  mk({ id: "mouse_hash", nome: "Mouse HashClick", categoria: "periferico", emoji: "🖱️", preco: 1100, nivelMin: 3, hs: 0.2, desc: "Cliques mais lucrativos." }),
  mk({ id: "teclado_rgb", nome: "Teclado RGB MAS", categoria: "periferico", emoji: "⌨️", preco: 2600, nivelMin: 6, hs: 0.6, desc: "RGB é hashrate visual." }),
  mk({ id: "cooler_pro", nome: "Cooler Ártico Pro", categoria: "periferico", emoji: "❄️", preco: 8400, nivelMin: 11, hs: 2.4, desc: "Mantém as rigs geladas." }),
  // ---------- OUTROS (pets / bônus %) ----------
  mk({ id: "gato", nome: "Gato Minerador", categoria: "outro", emoji: "🐱", preco: 3000, nivelMin: 5, bonusPct: 0.02, desc: "+2% de mineração passiva." }),
  mk({ id: "robo", nome: "Robô Assistente", categoria: "outro", emoji: "🤖", preco: 9000, nivelMin: 10, bonusPct: 0.05, desc: "+5% de mineração passiva." }),
  mk({ id: "dragao", nome: "Dragão do Hash", categoria: "outro", emoji: "🐉", preco: 25000, nivelMin: 22, bonusPct: 0.08, desc: "+8% de mineração passiva." }),
];

/* ------------------- RIGS (fazenda de mineração) ------------------- */
export interface Rig {
  id: string;
  nome: string;
  emoji: string;
  preco: number;
  taxa: number; // H/s por unidade
  energia: number;
  desc: string;
  ativo: boolean;
}

export const RIGS_PADRAO: Rig[] = [
  { id: "cpu", nome: "CPU Doméstica", emoji: "🖥️", preco: 250, taxa: 0.02, energia: 1, desc: "O começo de todo minerador.", ativo: true },
  { id: "gpu", nome: "Rack de GPUs", emoji: "🎮", preco: 1800, taxa: 0.18, energia: 4, desc: "Hashrate sólido para iniciantes.", ativo: true },
  { id: "asic", nome: "ASIC Titan", emoji: "⚙️", preco: 12000, taxa: 1.4, energia: 12, desc: "Máquina dedicada e lucrativa.", ativo: true },
  { id: "quantum", nome: "Núcleo Quântico", emoji: "🧊", preco: 85000, taxa: 11, energia: 30, desc: "Qubits trabalhando por você.", ativo: true },
  { id: "fusion", nome: "Reator de Fusão", emoji: "☀️", preco: 600000, taxa: 90, energia: 80, desc: "Energia estelar minerando MAS.", ativo: true },
];

/* ------------------- JOGOS DO CASSINO ------------------- */
export const JOGOS_META: { id: string; nome: string; emoji: string; desc: string; tag: string }[] = [
  { id: "crash", nome: "Crash", emoji: "🚀", desc: "Saque antes da explosão", tag: "Popular" },
  { id: "mines", nome: "Mines", emoji: "💣", desc: "Ache os diamantes", tag: "Estratégia" },
  { id: "slots", nome: "Caça-níqueis", emoji: "🎰", desc: "Até 50x no 7️⃣", tag: "Jackpot" },
  { id: "dados", nome: "Dados", emoji: "🎲", desc: "Chance customizável", tag: "Clássico" },
  { id: "roleta", nome: "Roleta", emoji: "🎡", desc: "Vermelho ou preto?", tag: "Clássico" },
  { id: "moeda", nome: "Cara ou Coroa", emoji: "🪙", desc: "50/50 · 1.96x", tag: "Rápido" },
  { id: "torre", nome: "Torre da Sorte", emoji: "🗼", desc: "8 andares de tensão", tag: "Novo" },
];

/* ------------------- CONFIG GLOBAL ------------------- */
export interface ConfigMineracao {
  cliqueAtivo: boolean;
  valorClique: number;
  cooldownMs: number;
  chanceCritico: number;
  multCritico: number;
  multiplicadorGlobal: number;
  capHoras: number;
  boostPreco: number;
  boostMult: number;
  boostSegundos: number;
}

export interface ConfigGlobal {
  versao: number;
  itens: ItemLoja[];
  rigs: Rig[];
  jogos: Record<string, boolean>;
  mineracao: ConfigMineracao;
  lojaAtiva: boolean;
  cassinoAtivo: boolean;
  saquesAtivos: boolean;
  saqueMinimo: number;
  taxaConversao: number;
  xpPorMAS: number;
  xpPorAposta: number;
  anuncio: string;
  atualizadoEm: number;
}

export const CONFIG_PADRAO: ConfigGlobal = {
  versao: 3,
  itens: ITENS_PADRAO,
  rigs: RIGS_PADRAO,
  jogos: Object.fromEntries(JOGOS_META.map((j) => [j.id, true])),
  mineracao: {
    cliqueAtivo: true,
    valorClique: 0.75,
    cooldownMs: 220,
    chanceCritico: 0.12,
    multCritico: 5,
    multiplicadorGlobal: 1,
    capHoras: 8,
    boostPreco: 500,
    boostMult: 3,
    boostSegundos: 60,
  },
  lojaAtiva: true,
  cassinoAtivo: true,
  saquesAtivos: true,
  saqueMinimo: 50,
  taxaConversao: 0.02,
  xpPorMAS: 0.2,
  xpPorAposta: 0.1,
  anuncio: "🎉 Bem-vindo à rede MAS! Recompensa diária liberada — colete todo dia e suba de nível.",
  atualizadoEm: 0,
};
