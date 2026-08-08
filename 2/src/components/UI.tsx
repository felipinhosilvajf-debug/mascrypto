import { useEffect, useState } from "react";
import { cn } from "../utils/cn";
import { fmtBRL, fmtMAS, fmtNum } from "../lib/economia";

/* Reexports para compatibilidade (formatação vem SEMPRE de lib/economia) */
export { fmtBRL, fmtMAS, fmtNum, fmtHS, fmtCompacto } from "../lib/economia";
/** @deprecated use fmtNum */
export const fmt = fmtNum;

/* ---------------------------------- CARD --------------------------------- */
export function Card({
  children,
  className,
  glow,
  hover,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative rounded-3xl border border-white/[0.08] bg-[linear-gradient(160deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] p-5 backdrop-blur-2xl",
        "shadow-[0_8px_40px_-12px_rgba(0,0,0,0.8)]",
        glow && "border-fuchsia-500/25 shadow-[0_0_60px_-18px_rgba(217,70,239,0.75)]",
        hover && "transition-all duration-300 hover:-translate-y-1 hover:border-fuchsia-400/40",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* --------------------------------- BOTÃO --------------------------------- */
export function Botao({
  children,
  className,
  variante = "primario",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "primario" | "ghost" | "perigo" | "sucesso" | "ouro" | "neon";
}) {
  const v = {
    primario:
      "bg-[linear-gradient(110deg,#c026d3,#7c3aed_55%,#4f46e5)] text-white shadow-[0_6px_24px_-8px_rgba(192,38,211,0.9)] hover:brightness-115",
    neon:
      "bg-transparent border border-cyan-400/50 text-cyan-200 hover:bg-cyan-400/10 hover:shadow-[0_0_20px_-4px_rgba(34,211,238,0.7)]",
    ghost: "bg-white/[0.06] border border-white/10 text-slate-200 hover:bg-white/[0.12]",
    perigo: "bg-[linear-gradient(110deg,#e11d48,#b91c1c)] text-white hover:brightness-110",
    sucesso:
      "bg-[linear-gradient(110deg,#10b981,#0d9488)] text-white shadow-[0_6px_24px_-8px_rgba(16,185,129,0.8)] hover:brightness-110",
    ouro:
      "bg-[linear-gradient(110deg,#fbbf24,#f59e0b)] text-slate-950 shadow-[0_6px_24px_-8px_rgba(245,158,11,0.9)] hover:brightness-110",
  }[variante];
  return (
    <button
      {...props}
      className={cn(
        "relative rounded-xl px-4 py-2.5 text-sm font-bold tracking-tight transition-all duration-200 active:scale-[0.96]",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
        v,
        className,
      )}
    >
      {children}
    </button>
  );
}

/* --------------------------------- INPUTS -------------------------------- */
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-sm text-white outline-none transition",
        "placeholder:text-slate-500 focus:border-fuchsia-500/60 focus:ring-2 focus:ring-fuchsia-600/20",
        props.className,
      )}
    />
  );
}

export function Campo({
  label,
  children,
  dica,
}: {
  label: string;
  children: React.ReactNode;
  dica?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
      {dica && <span className="mt-1 block text-[10px] text-slate-500">{dica}</span>}
    </label>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-sm text-white outline-none transition",
        "placeholder:text-slate-500 focus:border-fuchsia-500/60",
        props.className,
      )}
    />
  );
}

export function Switch({
  ligado,
  onChange,
  rotulo,
}: {
  ligado: boolean;
  onChange: (v: boolean) => void;
  rotulo?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!ligado)}
      className="flex items-center gap-2"
    >
      <span
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors duration-300",
          ligado ? "bg-emerald-500 shadow-[0_0_14px_-2px_rgba(16,185,129,0.9)]" : "bg-slate-700",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all duration-300",
            ligado ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
      {rotulo && (
        <span className={cn("text-xs font-bold", ligado ? "text-emerald-300" : "text-slate-500")}>
          {rotulo}
        </span>
      )}
    </button>
  );
}

/* --------------------------------- SELOS --------------------------------- */
export function Selo({
  children,
  tom = "violeta",
  className,
}: {
  children: React.ReactNode;
  tom?: "violeta" | "verde" | "ouro" | "vermelho" | "ciano" | "cinza";
  className?: string;
}) {
  const tons = {
    violeta: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/25",
    verde: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    ouro: "bg-amber-400/15 text-amber-300 border-amber-400/25",
    vermelho: "bg-rose-500/15 text-rose-300 border-rose-500/25",
    ciano: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
    cinza: "bg-white/5 text-slate-400 border-white/10",
  }[tom];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider",
        tons,
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------- SPARKLINE ------------------------------- */
export function Sparkline({ dados, cor = "#e879f9" }: { dados: number[]; cor?: string }) {
  if (dados.length < 2) return null;
  const min = Math.min(...dados);
  const max = Math.max(...dados);
  const r = max - min || 1;
  const pts = dados
    .map((v, i) => `${(i / (dados.length - 1)) * 100},${40 - ((v - min) / r) * 37}`)
    .join(" ");
  const gid = `g${cor.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full w-full">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.45" />
          <stop offset="100%" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,40 ${pts} 100,40`} fill={`url(#${gid})`} />
      <polyline
        points={pts}
        fill="none"
        stroke={cor}
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* --------------------------------- BARRA --------------------------------- */
export function Barra({ pct, cor = "from-fuchsia-500 to-amber-400", altura = "h-2" }: { pct: number; cor?: string; altura?: string }) {
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-white/10", altura)}>
      <div
        className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", cor)}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

/* --------------------------------- ABAS ---------------------------------- */
export function Abas<T extends string>({
  abas,
  ativa,
  onChange,
  className,
}: {
  abas: { id: T; nome: string; emoji?: string; badge?: number }[];
  ativa: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1.5 overflow-x-auto pb-1", className)}>
      {abas.map((a) => (
        <button
          key={a.id}
          onClick={() => onChange(a.id)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all",
            ativa === a.id
              ? "border-fuchsia-400/50 bg-fuchsia-600/25 text-white shadow-[0_0_20px_-8px_rgba(217,70,239,0.9)]"
              : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.09] hover:text-white",
          )}
        >
          {a.emoji && <span>{a.emoji}</span>}
          {a.nome}
          {!!a.badge && (
            <span className="rounded-full bg-rose-500 px-1.5 text-[9px] font-black text-white">{a.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------- MODAL --------------------------------- */
export function Modal({
  aberto,
  onFechar,
  titulo,
  children,
  largura = "max-w-lg",
}: {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  children: React.ReactNode;
  largura?: string;
}) {
  useEffect(() => {
    if (!aberto) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [aberto, onFechar]);
  if (!aberto) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center overflow-y-auto bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={onFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "animate-[subir_.3s_cubic-bezier(.2,.8,.2,1)] w-full rounded-t-3xl border border-white/10 bg-slate-950/95 shadow-2xl sm:rounded-3xl",
          largura,
        )}
      >
        <div className="sticky top-0 flex items-center justify-between rounded-t-3xl border-b border-white/10 bg-slate-950/95 px-5 py-3.5 backdrop-blur">
          <h3 className="font-black text-white">{titulo}</h3>
          <button
            onClick={onFechar}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function Confirmar({
  aberto,
  titulo,
  mensagem,
  onConfirmar,
  onCancelar,
  textoConfirmar = "Confirmar",
  perigo,
}: {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  textoConfirmar?: string;
  perigo?: boolean;
}) {
  return (
    <Modal aberto={aberto} onFechar={onCancelar} titulo={titulo} largura="max-w-md">
      <p className="text-sm text-slate-300">{mensagem}</p>
      <div className="mt-5 flex gap-2">
        <Botao variante="ghost" className="flex-1" onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao variante={perigo ? "perigo" : "primario"} className="flex-1" onClick={onConfirmar}>
          {textoConfirmar}
        </Botao>
      </div>
    </Modal>
  );
}

/* ------------------------- ARTE DO ITEM (PNG/emoji) ----------------------- */
export function ArteItem({
  emoji,
  imagem,
  tamanho = "text-4xl",
  className,
}: {
  emoji: string;
  imagem?: string;
  tamanho?: string;
  className?: string;
}) {
  const [erro, setErro] = useState(false);
  if (imagem && !erro)
    return (
      <img
        src={imagem}
        alt=""
        onError={() => setErro(true)}
        className={cn("h-12 w-12 object-contain drop-shadow-lg", className)}
      />
    );
  return <span className={cn(tamanho, "leading-none drop-shadow-lg", className)}>{emoji}</span>;
}

/* ------------------------------ ESTATÍSTICA ------------------------------ */
export function Estat({
  emoji,
  titulo,
  valor,
  sub,
  cor = "text-white",
}: {
  emoji: string;
  titulo: string;
  valor: string;
  sub?: string;
  cor?: string;
}) {
  return (
    <Card className="flex items-center gap-3 p-4" hover>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-2xl">
        {emoji}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">{titulo}</p>
        <p className={cn("truncate text-lg font-black", cor)}>{valor}</p>
        {sub && <p className="truncate text-[10px] text-slate-500">{sub}</p>}
      </div>
    </Card>
  );
}

/* ------------------------------ SALDO (pill) ----------------------------- */
export function PillSaldo({ mas, brl }: { mas: number; brl: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5">
        <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-400/80">Saldo MAS</p>
        <p className="text-sm font-black text-emerald-300">{fmtMAS(mas)}</p>
      </div>
      <div className="hidden rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-1.5 sm:block">
        <p className="text-[9px] font-bold uppercase tracking-wider text-sky-400/80">Reais</p>
        <p className="text-sm font-black text-sky-300">{fmtBRL(brl)}</p>
      </div>
    </div>
  );
}

export function Vazio({ emoji, titulo, texto }: { emoji: string; titulo: string; texto?: string }) {
  return (
    <div className="py-12 text-center">
      <div className="text-5xl opacity-70">{emoji}</div>
      <p className="mt-3 font-bold text-white">{titulo}</p>
      {texto && <p className="mt-1 text-sm text-slate-400">{texto}</p>}
    </div>
  );
}
