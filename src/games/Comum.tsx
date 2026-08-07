import { useState } from "react";
import { Botao, fmt } from "../components/UI";
import { useApp } from "../store/AppContext";

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
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Valor da aposta</span>
        <span>Saldo: {fmt(saldo)} MAS</span>
      </div>
      <input
        type="number"
        disabled={travado}
        value={aposta}
        min={1}
        onChange={(e) => setAposta(Math.max(1, Math.floor(Number(e.target.value) || 0)))}
        className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-lg font-bold text-white outline-none focus:border-fuchsia-500/60"
      />
      <div className="mt-2 flex gap-2">
        {[
          ["-", () => setAposta(Math.max(1, Math.floor(aposta / 2)))],
          ["2x", () => setAposta(Math.max(1, aposta * 2))],
          ["100", () => setAposta(100)],
          ["1k", () => setAposta(1000)],
          ["MAX", () => setAposta(Math.max(1, Math.floor(saldo)))],
        ].map(([l, f]) => (
          <Botao
            key={l as string}
            variante="ghost"
            disabled={travado}
            className="flex-1 px-0 py-1.5 text-xs"
            onClick={f as () => void}
          >
            {l as string}
          </Botao>
        ))}
      </div>
    </div>
  );
}

export function Painel({
  titulo,
  emoji,
  children,
  lateral,
}: {
  titulo: string;
  emoji: string;
  children: React.ReactNode;
  lateral: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-lg font-black text-white">
          {emoji} {titulo}
        </h3>
        {lateral}
      </div>
      <div className="flex min-h-[380px] items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-black/60 p-6">
        {children}
      </div>
    </div>
  );
}
