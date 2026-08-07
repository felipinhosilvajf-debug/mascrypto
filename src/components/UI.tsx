import { cn } from "../utils/cn";

export const fmt = (n: number, casas = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const fmtC = (n: number) =>
  n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e4 ? (n / 1e3).toFixed(1) + "k" : fmt(n);

export function Card({
  children,
  className,
  glow,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl",
        glow && "shadow-[0_0_40px_-12px_rgba(168,85,247,0.6)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Botao({
  children,
  className,
  variante = "primario",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "primario" | "ghost" | "perigo" | "sucesso" | "ouro";
}) {
  const v = {
    primario:
      "bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white hover:brightness-115 shadow-lg shadow-fuchsia-900/40",
    ghost: "bg-white/5 border border-white/15 text-slate-200 hover:bg-white/10",
    perigo: "bg-gradient-to-r from-rose-600 to-red-600 text-white hover:brightness-110",
    sucesso: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:brightness-110",
    ouro: "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 hover:brightness-110",
  }[variante];
  return (
    <button
      {...props}
      className={cn(
        "rounded-xl px-4 py-2.5 text-sm font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
        v,
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-fuchsia-500/60 focus:ring-2 focus:ring-fuchsia-600/20",
        props.className,
      )}
    />
  );
}

export function Selo({ children, cor = "violet" }: { children: React.ReactNode; cor?: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
        `bg-${cor}-500/15 text-${cor}-300`,
      )}
    >
      {children}
    </span>
  );
}

export function Sparkline({ dados, cor = "#e879f9" }: { dados: number[]; cor?: string }) {
  if (dados.length < 2) return null;
  const min = Math.min(...dados);
  const max = Math.max(...dados);
  const r = max - min || 1;
  const pts = dados
    .map((v, i) => `${(i / (dados.length - 1)) * 100},${40 - ((v - min) / r) * 38}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full w-full">
      <polyline points={pts} fill="none" stroke={cor} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <polyline points={`0,40 ${pts} 100,40`} fill={cor} opacity="0.12" />
    </svg>
  );
}
