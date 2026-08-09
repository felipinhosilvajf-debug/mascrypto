/* ============================================================
   FONTE ÚNICA DE VERDADE — formatação monetária e XP/Níveis
   Usada por TODOS os componentes (Header, Carteira, Quarto,
   Cassino, Mineração, Loja, Admin...). Não crie outra.
   ============================================================ */

const nf = (min: number, max: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: min, maximumFractionDigits: max });

/** Número puro no padrão brasileiro: 1.234,56 */
export function fmtNum(v: number, casas = 2): string {
  if (!isFinite(v)) v = 0;
  return nf(casas, casas).format(v);
}

/**
 * Saldo em MAS com precisão adaptativa:
 * valores muito pequenos ganham casas extras para não parecerem zero
 * (ex.: 0,0005 MAS), valores maiores caem no padrão de 2 casas.
 * Se `casas` for informado explicitamente, força esse número de casas.
 */
export function fmtMAS(v: number, casas?: number): string {
  if (typeof casas === "number") return `${fmtNum(v ?? 0, casas)} MAS`;
  return `${fmtDinamico(v ?? 0)} MAS`;
}

/** Saldo em reais → "R$ 80,50" */
export function fmtBRL(v: number): string {
  return `R$ ${fmtNum(v ?? 0, 2)}`;
}

/** Compacto para gráficos/rankings: 1,2M / 34,5k */
export function fmtCompacto(v: number): string {
  if (Math.abs(v) >= 1e9) return `${fmtNum(v / 1e9, 2)}B`;
  if (Math.abs(v) >= 1e6) return `${fmtNum(v / 1e6, 2)}M`;
  if (Math.abs(v) >= 1e4) return `${fmtNum(v / 1e3, 1)}k`;
  return fmtNum(v, 2);
}

/**
 * Precisão adaptativa: mostra casas extras em valores muito baixos e
 * reduz gradualmente conforme o valor cresce — o progresso nunca parece zerado.
 *  - 0 exato        → "0,00"
 *  - >0 e <0,01     → renderiza até o 1º dígito significativo (0,0005 · 0,009)
 *  - >=0,01         → padrão de 2 casas (0,15 · 1,00 · 1.400,00)
 */
export function fmtDinamico(v: number): string {
  const n = Number(v) || 0;
  if (n === 0) return fmtNum(0, 2);
  const abs = Math.abs(n);
  if (abs >= 0.01) return fmtNum(n, 2);
  // Posição do primeiro dígito significativo (ex.: 0,0005 → 4 casas)
  const casas = Math.min(10, Math.ceil(-Math.log10(abs)));
  return nf(casas, casas).format(n);
}

/** Hashrate com precisão adaptativa → "0,0005 H/s" · "0,15 H/s" · "1.400,00 H/s" */
export function fmtHS(v: number): string {
  return `${fmtDinamico(v ?? 0)} H/s`;
}

/* ------------------- XP / NÍVEIS ------------------- */
/** XP necessário para atingir determinado nível. Nível 1 = 0 XP. */
export const XP_BASE = 40;
export function xpDoNivel(nivel: number): number {
  const n = Math.max(1, Math.floor(nivel));
  return (n - 1) * (n - 1) * XP_BASE;
}

/** Nível derivado do XP — ÚNICA fórmula do sistema. */
export function nivelPorXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp || 0) / XP_BASE)) + 1;
}

/** Progresso 0-100 dentro do nível atual. */
export function progressoNivel(xp: number): {
  nivel: number;
  atual: number;
  necessario: number;
  pct: number;
} {
  const nivel = nivelPorXp(xp);
  const base = xpDoNivel(nivel);
  const prox = xpDoNivel(nivel + 1);
  const atual = Math.max(0, xp - base);
  const necessario = Math.max(1, prox - base);
  return { nivel, atual, necessario, pct: Math.min(100, (atual / necessario) * 100) };
}

/** Converte um nível desejado em XP (usado pelo Admin ao setar nível). */
export function xpParaNivel(nivel: number): number {
  return xpDoNivel(nivel);
}

/** Título/patente exibido no perfil e no quarto. */
export function patente(nivel: number): { nome: string; emoji: string; cor: string } {
  if (nivel >= 60) return { nome: "Lenda MAS", emoji: "🐉", cor: "text-fuchsia-300" };
  if (nivel >= 45) return { nome: "Baleia", emoji: "🐳", cor: "text-cyan-300" };
  if (nivel >= 30) return { nome: "Magnata", emoji: "👑", cor: "text-amber-300" };
  if (nivel >= 20) return { nome: "Investidor", emoji: "🦅", cor: "text-emerald-300" };
  if (nivel >= 12) return { nome: "Trader", emoji: "🐺", cor: "text-indigo-300" };
  if (nivel >= 6) return { nome: "Minerador", emoji: "🦊", cor: "text-orange-300" };
  return { nome: "Filhote", emoji: "🐣", cor: "text-slate-300" };
}
