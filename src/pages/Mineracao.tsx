import { useEffect, useRef, useState } from "react";
import { useApp } from "../store/AppContext";
import { Botao, Card, fmt } from "../components/UI";
import { RIGS } from "../lib/types";

export default function Mineracao() {
  const { data, atualizar, taxaMineracao, toast } = useApp();
  const [pendente, setPendente] = useState(0);
  const [bloco, setBloco] = useState(0);
  const [pops, setPops] = useState<{ id: number; x: number; v: number }[]>([]);
  const [boostAte, setBoostAte] = useState(0);
  const cliqueRef = useRef(0);

  useEffect(() => {
    if (!data) return;
    const i = setInterval(() => {
      const dt = (Date.now() - data.ultimaColeta) / 1000;
      const boost = Date.now() < boostAte ? 3 : 1;
      setPendente(Math.min(taxaMineracao * dt * boost, taxaMineracao * 3600 * 8));
      setBloco((b) => (b + 1) % 100);
    }, 200);
    return () => clearInterval(i);
  }, [data, taxaMineracao, boostAte]);

  if (!data) return null;

  const coletar = () => {
    if (pendente <= 0) return;
    const v = pendente;
    atualizar((d) => ({
      ...d,
      saldo: d.saldo + v,
      totalMinerado: d.totalMinerado + v,
      ultimaColeta: Date.now(),
      xp: d.xp + Math.floor(v / 5),
      historico: [{ t: "Mineração", v, d: "Coleta de bloco", ts: Date.now() }, ...d.historico].slice(0, 40),
    }));
    toast(`+${fmt(v)} MAS coletados ⛏️`, "ok");
    setPendente(0);
  };

  const picareta = (e: React.MouseEvent) => {
    cliqueRef.current++;
    const ganho = 0.5 + data.nivel * 0.25 + taxaMineracao * 0.5;
    const critico = Math.random() < 0.12;
    const v = critico ? ganho * 5 : ganho;
    atualizar((d) => ({ ...d, saldo: d.saldo + v, totalMinerado: d.totalMinerado + v, xp: d.xp + 1 }));
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const id = Date.now() + Math.random();
    setPops((p) => [...p, { id, x: e.clientX - rect.left, v }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 900);
  };

  const comprar = (id: string, preco: number, nome: string) => {
    const qtd = data.rigs[id] || 0;
    const custo = Math.round(preco * Math.pow(1.15, qtd));
    if (data.saldo < custo) return toast("Saldo insuficiente 😢", "erro");
    atualizar((d) => ({
      ...d,
      saldo: d.saldo - custo,
      rigs: { ...d.rigs, [id]: (d.rigs[id] || 0) + 1 },
      historico: [{ t: "Compra de rig", v: -custo, d: nome, ts: Date.now() }, ...d.historico].slice(0, 40),
    }));
    toast(`${nome} adquirido! ⚙️`, "ok");
  };

  const boostAtivo = Date.now() < boostAte;

  return (
    <div className="space-y-6">
      <Card glow className="relative overflow-hidden bg-gradient-to-br from-indigo-900/50 to-slate-950/70">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49%,#a855f7_50%,transparent_51%)] bg-[length:40px_40px]" />
        </div>
        <div className="relative grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-black text-white">⛏️ Central de Mineração</h2>
            <p className="mt-1 text-sm text-slate-400">
              Suas máquinas mineram MAS 24 horas por dia (capacidade máxima de 8h acumuladas).
            </p>
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/40 p-5">
              <p className="text-xs uppercase tracking-widest text-slate-400">Pendente para coleta</p>
              <p className="text-4xl font-black text-emerald-400">{fmt(pendente, 4)} MAS</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all" style={{ width: `${bloco}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Hashrate: <b className="text-white">{fmt(taxaMineracao, 3)} MAS/s</b> ·{" "}
                {fmt(taxaMineracao * 3600)} MAS/hora {boostAtivo && <span className="text-amber-300">· BOOST x3 🔥</span>}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Botao variante="sucesso" onClick={coletar} disabled={pendente <= 0}>
                  Coletar {fmt(pendente, 2)} MAS
                </Botao>
                <Botao
                  variante="ouro"
                  disabled={boostAtivo || data.saldo < 500}
                  onClick={() => {
                    atualizar((d) => ({ ...d, saldo: d.saldo - 500 }));
                    setBoostAte(Date.now() + 60000);
                    toast("Boost x3 ativado por 60 segundos! 🔥", "ok");
                  }}
                >
                  {boostAtivo ? "Boost ativo…" : "Boost x3 (500 MAS)"}
                </Botao>
              </div>
            </div>
          </div>

          <div className="relative flex flex-col items-center justify-center">
            <button
              onClick={picareta}
              className="group relative flex h-48 w-48 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-fuchsia-500 to-indigo-600 text-7xl shadow-[0_0_80px_-10px_rgba(217,70,239,0.8)] transition active:scale-90"
            >
              <span className="transition group-hover:rotate-12">⛏️</span>
              <span className="absolute inset-0 animate-ping rounded-full border border-fuchsia-400/40" />
            </button>
            <p className="mt-4 text-sm text-slate-400">Clique na picareta para minerar manualmente</p>
            {pops.map((p) => (
              <span
                key={p.id}
                className="pointer-events-none absolute bottom-24 animate-[flutuar_0.9s_ease-out_forwards] text-lg font-black text-emerald-300"
                style={{ left: p.x }}
              >
                +{fmt(p.v, 2)}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <div>
        <h3 className="mb-3 text-lg font-bold text-white">🏭 Loja de equipamentos</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RIGS.map((r) => {
            const qtd = data.rigs[r.id] || 0;
            const custo = Math.round(r.preco * Math.pow(1.15, qtd));
            return (
              <Card key={r.id} className="flex flex-col">
                <div className="flex items-start justify-between">
                  <div className="text-4xl">{r.emoji}</div>
                  <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-1 text-xs font-bold text-fuchsia-300">
                    x{qtd}
                  </span>
                </div>
                <h4 className="mt-2 font-bold text-white">{r.nome}</h4>
                <p className="text-xs text-slate-400">{r.desc}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-white/5 p-2">
                    <p className="text-slate-500">Hashrate</p>
                    <p className="font-bold text-emerald-400">{r.taxa} MAS/s</p>
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    <p className="text-slate-500">Energia</p>
                    <p className="font-bold text-amber-400">{r.energia} kW</p>
                  </div>
                </div>
                <Botao className="mt-3 w-full" disabled={data.saldo < custo} onClick={() => comprar(r.id, r.preco, r.nome)}>
                  Comprar · {fmt(custo, 0)} MAS
                </Botao>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
