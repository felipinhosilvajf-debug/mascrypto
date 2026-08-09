/* ============================================================
   CATÁLOGO GLOBAL — itens da loja, jogos, banners e config.
   PADRÕES iniciais: o Admin pode criar, editar e excluir tudo em
   tempo real (ver src/store/ConfigContext.tsx) com persistência
   no Firestore (config/global) e sincronização via onSnapshot.
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
  | "avatar"
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
  { id: "avatar", nome: "Avatares", emoji: "👤", slot: null, geraHS: true },
  { id: "outro", nome: "Outros acessórios", emoji: "🧩", slot: "pet", geraHS: true },
];

export const GRUPOS_ADMIN: { id: string; nome: string; cats: Categoria[] }[] = [
  { id: "roupas", nome: "👕 Roupas", cats: ["camisa", "calca", "sapato"] },
  { id: "acessorios", nome: "🎩 Acessórios", cats: ["chapeu", "oculos"] },
  { id: "avatares", nome: "👤 Avatares Customizados", cats: ["avatar"] },
  { id: "gpus", nome: "🖥️ Placas de vídeo", cats: ["gpu"] },
  { id: "moveis", nome: "🪑 Móveis", cats: ["movel"] },
  { id: "perifericos", nome: "🖱️ Periféricos", cats: ["periferico"] },
  { id: "outros", nome: "🧩 Outros", cats: ["outro"] },
];

export function infoCategoria(c: Categoria) {
  return CATEGORIAS.find((x) => x.id === c) || CATEGORIAS[CATEGORIAS.length - 1];
}

/* ---------------- RARIDADE ---------------- */
export type Raridade = "comum" | "raro" | "epico" | "lendario" | "mitico";

export const RARIDADES: { id: Raridade; nome: string; cor: string; brilho: string; texto: string }[] = [
  { id: "comum",     nome: "Comum",     cor: "#94a3b8",  texto: "text-slate-300",  brilho: "shadow-[0_0_12px_-4px_#94a3b8]" },
  { id: "raro",      nome: "Raro",      cor: "#3b82f6",  texto: "text-blue-300",   brilho: "shadow-[0_0_14px_-4px_#3b82f6]" },
  { id: "epico",     nome: "Épico",     cor: "#a855f7",  texto: "text-purple-300", brilho: "shadow-[0_0_16px_-4px_#a855f7]" },
  { id: "lendario",  nome: "Lendário",  cor: "#f59e0b",  texto: "text-amber-300",  brilho: "shadow-[0_0_18px_-4px_#f59e0b]" },
  { id: "mitico",    nome: "Mítico",    cor: "#ec4899",  texto: "text-pink-300",   brilho: "shadow-[0_0_20px_-4px_#ec4899]" },
];

export function infoRaridade(r: Raridade | undefined | null) {
  return RARIDADES.find((x) => x.id === r) || RARIDADES[0];
}

export interface ItemLoja {
  id: string;
  nome: string;
  desc: string;
  categoria: Categoria;
  /** Nível de raridade do item (Comum é o padrão/fallback). */
  raridade?: Raridade;
  emoji: string;
  /** URL de imagem PNG (opcional). Se vazio usa o emoji. */
  imagem: string;
  preco: number;
  nivelMin: number;
  /** Hashrate gerado quando equipado (0 para roupas). */
  hs: number;
  /**
   * Oscilação (0-1) do H/s do item.
   * Quando > 0, o valor efetivo varia entre `hs*(1-osc)` e `hs*(1+osc)`
   * a cada intervalo, dando "vida" à mineração dos hardware equipados.
   * `0` mantém o valor fixo (comportamento padrão).
   */
  hsOscilacao?: number;
  /** Intervalo em segundos entre trocas de valor oscilante. Padrão 4s. */
  hsIntervaloS?: number;
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
    raridade: "comum",
    nivelMin: 1,
    hs: 0,
    hsOscilacao: 0,
    hsIntervaloS: 4,
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
  mk({ id: "calca_jeans", nome: "Jeans do Minerador", categoria: "calca", emoji: "👖", preco: 420, nivelMin: 1, desc: "Resistente à rotina de mineração." }),
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
  mk({ id: "cooler_pro", nome: "Cooler Ártico Pro", categoria: "periferico", emoji: "❄️", preco: 8400, nivelMin: 11, hs: 2.4, desc: "Mantém seu hardware gelado." }),
  // ---------- OUTROS (pets / bônus %) ----------
  mk({ id: "gato", nome: "Gato Minerador", categoria: "outro", emoji: "🐱", preco: 3000, nivelMin: 5, bonusPct: 0.02, desc: "+2% de mineração passiva." }),
  mk({ id: "robo", nome: "Robô Assistente", categoria: "outro", emoji: "🤖", preco: 9000, nivelMin: 10, bonusPct: 0.05, desc: "+5% de mineração passiva." }),
  mk({ id: "dragao", nome: "Dragão do Hash", categoria: "outro", emoji: "🐉", preco: 25000, nivelMin: 22, bonusPct: 0.08, desc: "+8% de mineração passiva." }),
];

/* ------------------- JOGOS DO CASSINO ------------------- */
export interface JogoConfig {
  id: string;
  nome: string;
  emoji: string;
  desc: string;
  tag: string;
  /** RTP — chance de retorno/vitória (0-1). Ex.: 0.97 = 97%. */
  rtp: number;
  /** Margem informativa/operacional da casa (0-1). */
  houseEdge: number;
  /** Limites individuais de aposta em MAS. */
  apostaMin: number;
  apostaMax: number;
  /** Valor pré-digitado no campo de aposta ao entrar no jogo. */
  apostaPadrao: number;
  /**
   * Atalhos do painel de aposta. Cada atalho pode ser:
   *  - operação: `op: "half" | "double" | "max"`
   *  - valor fixo: `valor: número em MAS`
   */
  atalhos: { label: string; op?: "half" | "double" | "max"; valor?: number }[];
  /** URL de imagem de capa exibida no lobby. */
  capa: string;
  /** URL de GIF/animacao de destaque. */
  gif: string;
  ativo: boolean;
}

/** Atalhos padrão usados quando o jogo não define os seus. */
export const ATALHOS_APOSTA_PADRAO: JogoConfig["atalhos"] = [
  { label: "½",   op: "half"   },
  { label: "2×",  op: "double" },
  { label: "100", valor: 100    },
  { label: "1k",  valor: 1000   },
  { label: "MAX", op: "max"    },
];

export const JOGOS_META: Omit<JogoConfig, "capa" | "gif" | "ativo" | "apostaPadrao" | "atalhos">[] = [
  { id: "crash", nome: "Crash", emoji: "🚀", desc: "Saque antes da explosão", tag: "Popular", rtp: 0.99, houseEdge: 0.01, apostaMin: 1, apostaMax: 100000 },
  { id: "mines", nome: "Mines", emoji: "💣", desc: "Ache os diamantes", tag: "Estratégia", rtp: 0.97, houseEdge: 0.03, apostaMin: 1, apostaMax: 100000 },
  { id: "slots", nome: "Caça-níqueis", emoji: "🎰", desc: "Até 50x no sete", tag: "Jackpot", rtp: 0.885, houseEdge: 0.115, apostaMin: 1, apostaMax: 50000 },
  { id: "dados", nome: "Dados", emoji: "🎲", desc: "Chance customizável", tag: "Clássico", rtp: 0.98, houseEdge: 0.02, apostaMin: 1, apostaMax: 100000 },
  { id: "roleta", nome: "Roleta", emoji: "🎡", desc: "Vermelho ou preto?", tag: "Clássico", rtp: 0.97, houseEdge: 0.03, apostaMin: 1, apostaMax: 100000 },
  { id: "moeda", nome: "Cara ou Coroa", emoji: "🪙", desc: "50/50 · 1.96x", tag: "Rápido", rtp: 0.98, houseEdge: 0.02, apostaMin: 1, apostaMax: 100000 },
  { id: "torre", nome: "Torre da Sorte", emoji: "🗼", desc: "8 andares de tensão", tag: "Tensão", rtp: 0.967, houseEdge: 0.033, apostaMin: 1, apostaMax: 50000 },
  { id: "double", nome: "Double Neon", emoji: "◉", desc: "Vermelho, preto ou dourado", tag: "Novo", rtp: 0.96, houseEdge: 0.04, apostaMin: 1, apostaMax: 75000 },
  { id: "plinko", nome: "Plinko Matrix", emoji: "◆", desc: "Solte a esfera e multiplique", tag: "Novo", rtp: 0.95, houseEdge: 0.05, apostaMin: 1, apostaMax: 50000 },
  { id: "wheel", nome: "Roda da Fortuna", emoji: "☸", desc: "Gire e multiplique até 20x", tag: "Novo", rtp: 0.96, houseEdge: 0.04, apostaMin: 1, apostaMax: 60000 },
  { id: "hilo", nome: "Hi-Lo", emoji: "🂡", desc: "Maior ou menor que a carta", tag: "Novo", rtp: 0.97, houseEdge: 0.03, apostaMin: 1, apostaMax: 80000 },
  { id: "limbo", nome: "Limbo", emoji: "⇡", desc: "Escolha o alvo e desafie a sorte", tag: "Novo", rtp: 0.98, houseEdge: 0.02, apostaMin: 1, apostaMax: 100000 },
  { id: "keno", nome: "Keno MAS", emoji: "⬢", desc: "Escolha 10 de 40 números", tag: "Novo", rtp: 0.94, houseEdge: 0.06, apostaMin: 1, apostaMax: 40000 },
  { id: "hotzone", nome: "Hot Zone", emoji: "⬤", desc: "Ache a zona segura e saque", tag: "Novo", rtp: 0.96, houseEdge: 0.04, apostaMin: 1, apostaMax: 60000 },
];

export function jogoPadrao(id: string): JogoConfig {
  const meta = JOGOS_META.find((j) => j.id === id);
  return {
    id,
    nome: meta?.nome || id,
    emoji: meta?.emoji || "🎲",
    desc: meta?.desc || "",
    tag: meta?.tag || "Clássico",
    rtp: meta?.rtp ?? 0.97,
    houseEdge: meta?.houseEdge ?? 0.03,
    apostaMin: meta?.apostaMin ?? 1,
    apostaMax: meta?.apostaMax ?? 100000,
    apostaPadrao: 50,
    atalhos: ATALHOS_APOSTA_PADRAO,
    capa: "",
    gif: "",
    ativo: true,
  };
}

/* ------------------- BANNERS & AVISOS ------------------- */
export interface Banner {
  id: string;
  titulo: string;
  desc: string;
  imagem: string;
  ctaTexto: string;
  ctaLink: string;
  ativo: boolean;
  /** Classes tailwind do gradiente de fundo (fallback sem imagem). */
  cor: string;
}

export const BANNERS_PADRAO: Banner[] = [
  {
    id: "b1",
    titulo: "🚀 Bem-vindo ao MAScrypto",
    desc: "Ganhe MAS diários, monte sua fazenda e suba no ranking global da rede.",
    imagem: "",
    ctaTexto: "Começar a minerar",
    ctaLink: "#/mineracao",
    ativo: true,
    cor: "from-fuchsia-600/50 via-indigo-800/40 to-slate-950",
  },
  {
    id: "b2",
    titulo: "🎰 Jackpot do Crash",
    desc: "Multiplicadores de até 100x esperando por você. Saque antes da explosão!",
    imagem: "",
    ctaTexto: "Jogar Crash",
    ctaLink: "#/cassino",
    ativo: true,
    cor: "from-amber-500/50 via-rose-800/40 to-slate-950",
  },
  {
    id: "b3",
    titulo: "🛒 MAS Market aberto",
    desc: "Equipamentos aumentam seu H/s e roupas deixam seu avatar impecável.",
    imagem: "",
    ctaTexto: "Ver a loja",
    ctaLink: "#/loja",
    ativo: true,
    cor: "from-emerald-600/50 via-teal-800/40 to-slate-950",
  },
];

/* ------------------- CONFIG MINERAÇÃO ------------------- */
export interface ConfigMineracao {
  /** Ring automática global — unidade base invisível da rede MAScrypto. */
  ringAtiva: boolean;
  ringNome: string;
  ringDesc: string;
  ringHashrate: number;
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
  /** Liga/desliga a compra do Boost na Central de Mineração. */
  boostAtivo: boolean;
  /** Cor (hex) do botão de Boost. */
  boostCor: string;
}

/* ------------------- CONFIG DO GRÁFICO ------------------- */
/**
 * Motor do gráfico de cotação exibido na Home/Carteira.
 * - `modo` define o comportamento das amostras.
 * - `intervaloMs` controla a frequência de atualização.
 * - `amplitude` é o desvio relativo (0-1) permitido em torno da cotação oficial.
 * - `picos` são forças ocasionais (bull/bear/neutro) aplicadas periodicamente.
 * A cotação oficial (`cotacaoMAS`) segue sendo a fonte para toda conversão.
 */
export type ModoGrafico = "smooth" | "volatile" | "bull" | "bear" | "flat";

export interface ConfigGrafico {
  ativo: boolean;
  modo: ModoGrafico;
  /** Intervalo de atualização em milissegundos (>=500ms). */
  intervaloMs: number;
  /** Amplitude de variação relativa (0 a 1). Ex.: 0.02 = ±2%. */
  amplitude: number;
  /** Amplitude máxima permitida durante um pico (0 a 1). */
  picoAmplitude: number;
  /** Probabilidade de um pico ocorrer em cada tick (0 a 1). */
  picoChance: number;
  /** Número de amostras exibidas no gráfico. */
  janela: number;
  /** Suavização exponencial (0 = sem, 1 = trava total). */
  suavizacao: number;
  /** Preço mínimo permitido (opcional). */
  precoMin: number;
  /** Preço máximo permitido (0 = sem limite). */
  precoMax: number;
}

export const CONFIG_GRAFICO_PADRAO: ConfigGrafico = {
  ativo: true,
  modo: "smooth",
  intervaloMs: 2000,
  amplitude: 0.015,
  picoAmplitude: 0.05,
  picoChance: 0.08,
  janela: 80,
  suavizacao: 0.55,
  precoMin: 0.01,
  precoMax: 0,
};

export interface ConfigOverrides {
  usuariosReal: boolean; // se false, usa valor ficticio ou multiplicador
  usuariosFicticio: number;
  masFicticio: number;
  apostasFicticio: number;
  mineradoresFicticio: number;
}

export interface ConfigVisual {
  sloganPhrase: string;
  particulasAtivas: boolean;
  neonGlowAtivo: boolean;
}

/** Feature exibida na landing (ícone + título + descrição). */
export interface LandingFeature {
  icone: string;
  titulo: string;
  desc: string;
}

/** Configuração completa da Index / Login / Cadastro — editável no Admin. */
export interface ConfigLanding {
  marca: string;               // nome da marca (ex.: MAScrypto)
  logoUrl: string;             // URL opcional de logo (substitui o emoji)
  logoEmoji: string;           // emoji/ícone do logo se não houver URL
  titulo: string;              // headline principal
  subtitulo: string;           // frase de apoio
  slogan: string;              // texto com efeito de digitação
  btnEntrar: string;           // rótulo do botão de login
  btnCriar: string;            // rótulo do botão de cadastro
  rodape: string;              // texto do rodapé
  corPrimaria: string;         // hex — cor de destaque/botões
  corSecundaria: string;       // hex — segunda cor do gradiente/neon
  corFundo: string;            // hex — cor de fundo da tela
  pixelArt: boolean;           // liga a grade de pixel-art neon animada
  particulas: boolean;         // liga partículas flutuantes
  scanlines: boolean;          // liga efeito de scanlines CRT
  brilhoNeon: boolean;         // liga o glow neon dos cards/textos
  features: LandingFeature[];  // grade de destaques
}

export interface ConfigRequisitosNivel {
  /** Nível mínimo para comprar qualquer item na Loja (além do nível individual do item). */
  comprarLoja: number;
  /** Nível mínimo para abrir a aba Mundo. */
  acessarMundo: number;
  /** Nível mínimo para visitar quartos de outros membros. */
  visitarQuartos: number;
  /** Nível mínimo para enviar mensagem no chat local do quarto. */
  chatQuarto: number;
  /** Nível mínimo para comprar slots extras de hardware no quarto. */
  comprarSlotHardware: number;
}

/* ------------------- CONFIG GLOBAL ------------------- */
export interface ConfigModulos {
  /** Aba Mundo (chat de quartos e diretório) */
  mundo: boolean;
  /** Aba Loja */
  loja: boolean;
  /** Aba Cassino */
  cassino: boolean;
  /** Aba Carteira */
  carteira: boolean;
  /** Aba Suporte */
  suporte: boolean;
  /** Aba Ranking */
  ranking: boolean;
  /** Aba Quarto */
  quarto: boolean;
  /** Aba Mineração */
  mineracao: boolean;
}

export interface ConfigGlobal {
  versao: number;
  itens: ItemLoja[];
  jogos: Record<string, JogoConfig>;
  banners: Banner[];
  mineracao: ConfigMineracao;
  lojaAtiva: boolean;
  cassinoAtivo: boolean;
  saquesAtivos: boolean;
  depositoMinimo: number;
  saqueMinimo: number;
  taxaConversao: number;
  /** Saldo em MAS creditado UMA ÚNICA VEZ no cadastro. */
  saldoInicial: number;
  /** Cotação do MAS em Reais — 1 MAS = R$ cotacaoMAS. */
  cotacaoMAS: number;
  /** Configuração do gráfico dinâmico do MAS. */
  grafico: ConfigGrafico;
  xpPorMAS: number;
  xpPorAposta: number;
  anuncio: string;
  /** Configuração da recompensa diária de login. */
  recompensaDiaria: ConfigRecompensaDiaria;
  /** Configuração da bilheteria de blocos. */
  bilheteria: ConfigBilheteria;
  overrides: ConfigOverrides;
  visual: ConfigVisual;
  /** Configuração completa da Index/Login/Cadastro. */
  landing: ConfigLanding;
  /** Ativação/desativação individual de abas e módulos do site. */
  modulos: ConfigModulos;
  /** Requisitos globais de nível configuráveis pelo Admin. */
  requisitosNivel: ConfigRequisitosNivel;
  /** Custo em MAS para comprar 1 slot extra de hardware no quarto. */
  custoSlotHardware: number;
  /** Capacidade máxima global de slots (pode ser sobrescrita por conta). */
  limiteSlotHardwareGlobal: number;
  /**
   * Galeria de avatares gratuitos gerenciados pelo Admin.
   * Ficam disponíveis a todos os usuários sem passar pela loja.
   * Cada entrada pode ser um emoji simples ou ter URL de imagem.
   */
  avataresPadrao: { id: string; emoji: string; imagem: string; nome: string }[];
  atualizadoEm: number;
}

export interface ConfigRecompensaDiaria {
  ativa: boolean;
  premios: number[]; // um valor por dia de streak (índice 0 = dia 1)
  multiplicadorStreak: number; // não usado diretamente; para customização futura
}

export interface ConfigBilheteria {
  ativa: boolean;
  custoBilhete: number;       // MAS por bilhete
  taxaCasa: number;           // MAS de taxa por bilhete
  totalBlocos: number;        // sempre 50
  duracaoMs: number;          // duração de cada rodada em ms
  sorteioEmMs: number;        // timestamp do próximo sorteio (0 = admin define)
  rodadaAtual: number;        // contador de rodadas
  poteAtual: number;          // MAS acumulados na rodada atual
  pausada: boolean;
}

export const CONFIG_PADRAO: ConfigGlobal = {
  versao: 8,
  itens: ITENS_PADRAO,
  jogos: Object.fromEntries(JOGOS_META.map((j) => [j.id, jogoPadrao(j.id)])),
  banners: BANNERS_PADRAO,
  mineracao: {
    ringAtiva: true,
    ringNome: "Ring MAS Padrão",
    ringDesc: "Unidade de processamento automática da rede MAScrypto.",
    ringHashrate: 0.005,
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
    boostAtivo: true,
    boostCor: "#f59e0b",
  },
  lojaAtiva: true,
  cassinoAtivo: true,
  saquesAtivos: true,
  depositoMinimo: 0.1,
  saqueMinimo: 2.5,
  taxaConversao: 0.02,
  saldoInicial: 10,
  cotacaoMAS: 1.87,
  grafico: CONFIG_GRAFICO_PADRAO,
  xpPorMAS: 0.2,
  xpPorAposta: 0.1,
  anuncio: "🎉 Bem-vindo à rede MAS! Recompensa diária liberada — colete todo dia e suba de nível.",
  recompensaDiaria: {
    ativa: true,
    premios: [150, 300, 500, 800, 1200, 2000, 5000],
    multiplicadorStreak: 1,
  },
  bilheteria: {
    ativa: true,
    custoBilhete: 2,
    taxaCasa: 0.5,
    totalBlocos: 50,
    duracaoMs: 3600000, // 1h
    sorteioEmMs: 0,
    rodadaAtual: 1,
    poteAtual: 0,
    pausada: false,
  },
  overrides: {
    usuariosReal: true,
    usuariosFicticio: 1842,
    masFicticio: 5213000,
    apostasFicticio: 128400,
    mineradoresFicticio: 963,
  },
  visual: {
    sloganPhrase: "MINE. CONVERTA. EVOLUA.",
    particulasAtivas: true,
    neonGlowAtivo: true,
  },
  landing: {
    marca: "MAScrypto",
    logoUrl: "",
    logoEmoji: "◆",
    titulo: "A economia cripto gamificada.",
    subtitulo: "Mine, jogue no cassino, decore seu quarto 3D e evolua na rede MAS.",
    slogan: "MINE. CONVERTA. EVOLUA.",
    btnEntrar: "Entrar",
    btnCriar: "Criar conta",
    rodape: "MAScrypto · rede de entretenimento com créditos virtuais · +18",
    corPrimaria: "#d946ef",
    corSecundaria: "#22d3ee",
    corFundo: "#05040c",
    pixelArt: true,
    particulas: true,
    scanlines: true,
    brilhoNeon: true,
    features: [
      { icone: "⛏️", titulo: "Mineração", desc: "Ganhe MAS 24h por dia" },
      { icone: "🎰", titulo: "Cassino", desc: "12 jogos + bilheteria" },
      { icone: "🏠", titulo: "Quarto 3D", desc: "Decore e receba visitas" },
      { icone: "🌐", titulo: "Mundo", desc: "Explore a comunidade" },
    ],
  },
  modulos: {
    mundo: true,
    loja: true,
    cassino: true,
    carteira: true,
    suporte: true,
    ranking: true,
    quarto: true,
    mineracao: true,
  },
  requisitosNivel: {
    comprarLoja: 1,
    acessarMundo: 1,
    visitarQuartos: 1,
    chatQuarto: 1,
    comprarSlotHardware: 1,
  },
  custoSlotHardware: 5000,
  limiteSlotHardwareGlobal: 16,
  avataresPadrao: [
    { id: "av_1",  emoji: "🦊", imagem: "", nome: "Raposa"     },
    { id: "av_2",  emoji: "🐻", imagem: "", nome: "Urso"       },
    { id: "av_3",  emoji: "🐼", imagem: "", nome: "Panda"      },
    { id: "av_4",  emoji: "🐸", imagem: "", nome: "Sapo"       },
    { id: "av_5",  emoji: "🦁", imagem: "", nome: "Leão"       },
    { id: "av_6",  emoji: "🐧", imagem: "", nome: "Pinguim"    },
    { id: "av_7",  emoji: "🐳", imagem: "", nome: "Baleia"     },
    { id: "av_8",  emoji: "🦄", imagem: "", nome: "Unicórnio"  },
    { id: "av_9",  emoji: "👽", imagem: "", nome: "Alienígena" },
    { id: "av_10", emoji: "🤠", imagem: "", nome: "Cowboy"     },
    { id: "av_11", emoji: "🧙", imagem: "", nome: "Mago"       },
    { id: "av_12", emoji: "🥷", imagem: "", nome: "Ninja"      },
    { id: "av_13", emoji: "🐺", imagem: "", nome: "Lobo"       },
    { id: "av_14", emoji: "🦉", imagem: "", nome: "Coruja"     },
    { id: "av_15", emoji: "🐲", imagem: "", nome: "Dragão"     },
    { id: "av_16", emoji: "🦈", imagem: "", nome: "Tubarão"    },
  ],
  atualizadoEm: 0,
};
