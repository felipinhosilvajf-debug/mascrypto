export type RigId = "cpu" | "gpu" | "asic" | "quantum" | "fusion";

export interface Rig {
  id: RigId;
  nome: string;
  emoji: string;
  preco: number;
  taxa: number; // MAS por segundo
  energia: number;
  desc: string;
}

export const RIGS: Rig[] = [
  { id: "cpu", nome: "CPU Doméstica", emoji: "🖥️", preco: 250, taxa: 0.02, energia: 1, desc: "O começo de todo minerador." },
  { id: "gpu", nome: "Placa RTX MAS", emoji: "🎮", preco: 1800, taxa: 0.18, energia: 4, desc: "Hashrate sólido para iniciantes ambiciosos." },
  { id: "asic", nome: "ASIC Titan", emoji: "⚙️", preco: 12000, taxa: 1.4, energia: 12, desc: "Máquina dedicada, barulhenta e lucrativa." },
  { id: "quantum", nome: "Núcleo Quântico", emoji: "🧊", preco: 85000, taxa: 11, energia: 30, desc: "Qubits trabalhando por você." },
  { id: "fusion", nome: "Reator de Fusão", emoji: "☀️", preco: 600000, taxa: 90, energia: 80, desc: "Energia estelar minerando MAS." },
];

export interface ItemLoja {
  id: string;
  nome: string;
  emoji: string;
  preco: number;
  categoria: "movel" | "piso" | "parede" | "pet" | "avatar";
  desc: string;
}

export const ITENS: ItemLoja[] = [
  { id: "sofa", nome: "Sofá Neon", emoji: "🛋️", preco: 400, categoria: "movel", desc: "Conforto para longas sessões." },
  { id: "cama", nome: "Cama Cripto", emoji: "🛏️", preco: 650, categoria: "movel", desc: "Sonhos com velas verdes." },
  { id: "planta", nome: "Planta da Sorte", emoji: "🪴", preco: 200, categoria: "movel", desc: "+ashe de sorte no cassino (dizem)." },
  { id: "tv", nome: "TV Ultra 8K", emoji: "📺", preco: 1200, categoria: "movel", desc: "Assista os gráficos em 8K." },
  { id: "setup", nome: "Setup Gamer", emoji: "🖥️", preco: 2500, categoria: "movel", desc: "RGB é hashrate visual." },
  { id: "cofre", nome: "Cofre Blindado", emoji: "🔐", preco: 5000, categoria: "movel", desc: "Guarde suas chaves privadas." },
  { id: "quadro", nome: "NFT Emoldurado", emoji: "🖼️", preco: 3200, categoria: "parede", desc: "Arte digital rara na parede." },
  { id: "janela", nome: "Janela Panorâmica", emoji: "🪟", preco: 1800, categoria: "parede", desc: "Vista pra lua. 🌕" },
  { id: "relogio", nome: "Relógio de Ouro", emoji: "🕰️", preco: 2200, categoria: "parede", desc: "Tempo é dinheiro." },
  { id: "gato", nome: "Gato Minerador", emoji: "🐱", preco: 3000, categoria: "pet", desc: "+2% de mineração passiva." },
  { id: "dragao", nome: "Dragão do Hash", emoji: "🐉", preco: 25000, categoria: "pet", desc: "+8% de mineração passiva." },
  { id: "robo", nome: "Robô Assistente", emoji: "🤖", preco: 9000, categoria: "pet", desc: "+5% de mineração passiva." },
  { id: "coroa", nome: "Coroa do Baleia", emoji: "👑", preco: 50000, categoria: "avatar", desc: "Status de whale." },
  { id: "oculos", nome: "Óculos Cyber", emoji: "🕶️", preco: 1500, categoria: "avatar", desc: "Visual de trader." },
  { id: "foguete", nome: "Foguete Decorativo", emoji: "🚀", preco: 15000, categoria: "movel", desc: "To the moon literalmente." },
];

export const TEMAS = [
  { id: "neon", nome: "Neon Tokyo", classe: "from-fuchsia-600/40 via-indigo-800/40 to-slate-900" },
  { id: "floresta", nome: "Floresta Verde", classe: "from-emerald-600/40 via-teal-800/40 to-slate-900" },
  { id: "praia", nome: "Praia Dourada", classe: "from-amber-500/40 via-orange-700/40 to-slate-900" },
  { id: "espaco", nome: "Espaço Profundo", classe: "from-indigo-700/40 via-purple-900/40 to-black" },
  { id: "sangue", nome: "Bull Vermelho", classe: "from-rose-600/40 via-red-900/40 to-slate-900" },
];

export const AVATARES = ["🦊", "🐻", "🐼", "🐸", "🦁", "🐧", "🐳", "🦄", "👽", "🤠", "🧙", "🥷"];

export interface UserData {
  uid: string;
  nome: string;
  email: string;
  avatar: string;
  saldo: number; // MAS
  brl: number;
  xp: number;
  nivel: number;
  rigs: Record<string, number>;
  itens: string[];
  tema: string;
  quarto: Record<string, { x: number; y: number }>;
  ultimaColeta: number;
  ultimoLogin: string;
  streak: number;
  totalMinerado: number;
  apostas: number;
  vitorias: number;
  maiorGanho: number;
  historico: { t: string; v: number; d: string; ts: number }[];
  conquistas: string[];
  criadoEm: number;
}

export function novoUsuario(uid: string, nome: string, email: string): UserData {
  return {
    uid,
    nome,
    email,
    avatar: "🦊",
    saldo: 500,
    brl: 0,
    xp: 0,
    nivel: 1,
    rigs: { cpu: 1 },
    itens: [],
    tema: "neon",
    quarto: {},
    ultimaColeta: Date.now(),
    ultimoLogin: "",
    streak: 0,
    totalMinerado: 0,
    apostas: 0,
    vitorias: 0,
    maiorGanho: 0,
    historico: [],
    conquistas: [],
    criadoEm: Date.now(),
  };
}

export const CONQUISTAS = [
  { id: "primeiro", nome: "Primeiros Passos", emoji: "👣", desc: "Crie sua conta", premio: 100 },
  { id: "minerador", nome: "Minerador", emoji: "⛏️", desc: "Minere 1.000 MAS", premio: 250 },
  { id: "baleia", nome: "Baleia", emoji: "🐳", desc: "Tenha 100.000 MAS", premio: 5000 },
  { id: "sortudo", nome: "Sortudo", emoji: "🍀", desc: "Ganhe 10 apostas", premio: 500 },
  { id: "highroller", nome: "High Roller", emoji: "💎", desc: "Ganhe 10.000 MAS numa aposta", premio: 2000 },
  { id: "fiel", nome: "Fiel", emoji: "📅", desc: "7 dias de login seguidos", premio: 1500 },
  { id: "decorador", nome: "Decorador", emoji: "🏠", desc: "Compre 5 itens de quarto", premio: 800 },
];
