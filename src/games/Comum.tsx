import { useState } from "react";
import { Botao } from "../components/UI";
import { fmtMAS, fmtNum } from "../lib/economia";
import { useApp } from "../store/AppContext";
import { useConfig } from "../store/ConfigContext";

/**
 * Aplica o RTP configurado pelo Admin a um jogo com pagamento fixo `mult`.
 * P(vitória) = RTP / mult (limitado para nunca ser 0 ou 1 absoluto).
 */
export function resultadoComRtp(rtp: number | undefined, mult: number): boolean {
  const r = typeof rtp === "number" && rtp > 0 && rtp <= 1 ? rtp : 0.97;
  const p = Math.min(0.985, Math.max(0.015, r / mult));
  return Math.random() < p;
}

/** Lê a config RTP de um jogo pelo id. */
export function useRtp(id: string): number {
  const { cfg } = useConfig();
  return cfg.jogos[id]?.rtp ?? 0.97;
}

/** Estado de aposta compartilhado por todos os jogos (saldo vem do contexto central). */
export function useAposta(inicial = 50) {
  const { data } = useApp();
  const [aposta, setAposta] = useState(inicial);
  const saldo = data?.saldo ?? 0;
  return { aposta, setAposta, saldo, valida: aposta > 0 && aposta <= saldo };
}

export function ControleAposta({
  aposta,
  setAposta,
  saldo,
  travado,
}: {
  aposta: number;
  setAposta: (n: number) => void;
  saldo: number;
  travado?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-bold uppercase tracking-wider text-slate-400">Aposta</span>
        <span className="font-bold text-emerald-300">{fmtMAS(saldo)}</span>
      </div>
      <div className="relative mt-2">
        <input
          type="number"
          disabled={travado}
          value={aposta}
          min={1}
          onChange={(e) => setAposta(Math.max(1, Math.floor(Number(e.target.value) || 0)))}
          className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 pr-14 text-lg font-black text-white outline-none transition focus:border-fuchsia-500/60 disabled:opacity-50"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-fuchsia-400">MAS</span>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1">
        {(
          [
            ["½", () => setAposta(Math.max(1, Math.floor(aposta / 2)))],
            ["2×", () => setAposta(Math.max(1, aposta * 2))],
            ["100", () => setAposta(100)],
            ["1k", () => setAposta(1000)],
            ["MAX", () => setAposta(Math.max(1, Math.floor(saldo)))],
          ] as [string, () => void][]
        ).map(([l, f]) => (
          <button
            key={l}
            disabled={travado}
            onClick={f}
            className="rounded-lg border border-white/10 bg-white/[0.04] py-1.5 text-[11px] font-bold text-slate-300 transition hover:border-fuchsia-400/40 hover:bg-fuchsia-500/15 hover:text-white disabled:opacity-40"
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Moldura futurista comum a todos os jogos. */
export function Painel({
  titulo,
  emoji,
  children,
  lateral,
  brilho = "rgba(217,70,239,0.35)",
}: {
  titulo: string;
  emoji: string;
  children: React.ReactNode;
  lateral: React.ReactNode;
  brilho?: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[330px_1fr]">
      <div className="space-y-3 rounded-3xl border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] p-4 backdrop-blur-2xl">
        <h3 className="flex items-center gap-2 text-lg font-black text-white">
          <span className="text-2xl">{emoji}</span>
          {titulo}
        </h3>
        {lateral}
      </div>
      <div
        className="relative flex min-h-[400px] items-center justify-center overflow-hidden rounded-3xl border border-white/10 p-6"
        style={{
          background: `radial-gradient(120% 120% at 50% 0%, ${brilho}, rgba(2,2,10,0.9) 60%), #05040c`,
        }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:38px_38px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/70 to-transparent" />
        <div className="relative w-full">{children}</div>
      </div>
    </div>
  );
}

/** Exibição grande de resultado com feedback visual. */
export function Resultado({ texto, tom }: { texto: string; tom: "ok" | "erro" | "neutro" }) {
  if (!texto) return <p className="h-7" />;
  const cor =
    tom === "ok" ? "text-emerald-300" : tom === "erro" ? "text-rose-400" : "text-slate-300";
  return (
    <p className={`h-7 animate-[pulsar_.5s_ease-out] text-center text-lg font-black ${cor}`}>{texto}</p>
  );
}

export function BotaoJogar({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <Botao {...props} className="w-full py-3.5 text-base">
      {children}
    </Botao>
  );
}

export { fmtMAS, fmtNum };
