import { useEffect, useRef, useState } from "react";
import { useApp } from "../store/AppContext";
import { useConfig } from "../store/ConfigContext";
import { fmtHS, fmtMAS, fmtNum, nivelPorXp } from "../lib/economia";
import { Barra, Botao, Card, Estat, Selo } from "./UI";

export default function MiningView() {
  const {
    data,
    atualizar,
    mover,
    minerarClique,
    hashrate,
    detalheHash,
    toast,
    // ---- mineração global (roda em qualquer página) ----
    minerandoManual,
    siteVisivel,
    minerandoAtivo,
    pendenteMineracao,
    toggleMineracao,
    coletarMineracao,
    ativarBoost,
    boostAte,
  } = useApp();
  const { cfg } = useConfig();
  const [pulso, setPulso] = useState(0);
  const [pops, setPops] = useState<{ id: number; x: number; y: number; v: number; crit: boolean }[]>([]);
  const ultimoClique = useRef(0);
  const cliquesJanela = useRef<number[]>([]);

  const mc = cfg.mineracao;
  const boostAtivo = Date.now() < boostAte;
  const pendente = pendenteMineracao;

  /* Pulso visual da barra enquanto minerando */
  useEffect(() => {
    if (!minerandoAtivo) return;
    const i = setInterval(() => setPulso((p) => (p + 2) % 100), 200);
    return () => clearInterval(i);
  }, [minerandoAtivo]);

  if (!data) return null;
  const nivel = nivelPorXp(data.xp);

  const coletar = () => coletarMineracao();

  /* ---- MINERAÇÃO POR CLIQUE (configurável pelo Admin) ---- */
  const clicar = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!mc.cliqueAtivo) return toast("Mineração por clique desativada pela administração", "erro");
    const agora = Date.now();
    if (agora - ultimoClique.current < mc.cooldownMs) return; // anti-spam por cooldown
    // anti-exploit: no máximo 12 cliques válidos por 2s
    cliquesJanela.current = cliquesJanela.current.filter((t) => agora - t < 2000);
    if (cliquesJanela.current.length >= 12) {
      toast("Calma lá! Cliques rápidos demais 🐾", "erro");
      return;
    }
    cliquesJanela.current.push(agora);
    ultimoClique.current = agora;

    const crit = Math.random() < mc.chanceCritico;
    const base = mc.valorClique * (1 + (nivel - 1) * 0.05) * (boostAtivo ? mc.boostMult : 1);
    const v = Math.max(0, crit ? base * mc.multCritico : base);

    // UI soma na hora; a gravação é agrupada e persistida no Firestore
    minerarClique(v);

    const r = e.currentTarget.getBoundingClientRect();
    const id = agora + Math.random();
    setPops((p) => [
      ...p.slice(-12),
      { id, x: e.clientX - r.left, y: e.clientY - r.top, v, crit },
    ]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 900);
  };

  const comprarRig = (id: string, preco: number, nome: string) => {
    const qtd = data.rigs[id] || 0;
    const custo = Math.round(preco * Math.pow(1.15, qtd));
    if (data.saldo < custo) return toast("Saldo insuficiente", "erro");
    if (mover({ mas: -custo, titulo: "Mineração · Nova rig", detalhe: nome, xp: 20 }))
      atualizar((d) => ({ ...d, rigs: { ...d.rigs, [id]: (d.rigs[id] || 0) + 1 } }));
    toast(`${nome} instalada na fazenda! ⚙️`, "ok");
  };

  const capacidade = hashrate * 3600 * mc.capHoras;

  return (
    <div className="space-y-5">
      <Card glow className="overflow-hidden bg-[radial-gradient(120%_140%_at_80%_0%,rgba(6,182,212,0.18),transparent_55%)]">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-white">⛏️ Central de Mineração</h2>
              {boostAtivo && <Selo tom="ouro">🔥 BOOST x{mc.boostMult}</Selo>}
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Suas rigs e equipamentos mineram 24h. Capacidade máxima acumulada: {mc.capHoras}h.
            </p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pendente para coleta</p>
                  <p className="text-4xl font-black text-emerald-400">{fmtMAS(pendente, 4)}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Status do Ciclo</span>
                  {!minerandoManual ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-slate-400 bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5">
                      <span className="h-2 w-2 rounded-full bg-slate-400" /> Pausado
                    </span>
                  ) : !siteVisivel ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-amber-300 bg-amber-400/15 border border-amber-400/20 rounded-full px-2.5 py-0.5">
                      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" /> Site Inativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-emerald-300 bg-emerald-500/15 border border-emerald-500/20 rounded-full px-2.5 py-0.5 shadow-[0_0_15px_-3px_#10b981]">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Minerando...
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <Barra pct={pulso} cor="from-emerald-400 to-cyan-400" altura="h-1.5" />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  Hashrate: <b className="text-cyan-300">{fmtHS(hashrate)}</b>
                </span>
                <span>{fmtMAS(hashrate * 3600)}/hora</span>
              </div>
              <div className="mt-2">
                <Barra
                  pct={capacidade ? (pendente / capacidade) * 100 : 0}
                  cor="from-amber-400 to-rose-500"
                  altura="h-1"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Armazenamento {capacidade ? fmtNum((pendente / capacidade) * 100, 0) : 0}% cheio
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Botao
                  variante={minerandoManual ? "ghost" : "primario"}
                  onClick={() => {
                    toggleMineracao();
                    toast(minerandoManual ? "Mineração pausada" : "Mineração iniciada! Continua ativa em todo o site ⛏️", "info");
                  }}
                >
                  {minerandoManual ? "⏸ Pausar Mineração" : "▶ Iniciar Mineração"}
                </Botao>
                <Botao variante="sucesso" onClick={coletar} disabled={pendente <= 0.0001}>
                  Coletar {fmtMAS(pendente)}
                </Botao>
                <Botao variante="ouro" disabled={boostAtivo || data.saldo < mc.boostPreco} onClick={ativarBoost}>
                  {boostAtivo
                    ? `Ativo · ${Math.ceil((boostAte - Date.now()) / 1000)}s`
                    : `Boost x${mc.boostMult} (${fmtMAS(mc.boostPreco)})`}
                </Botao>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                <p className="text-slate-500">Rigs</p>
                <p className="font-black text-white">{fmtNum(detalheHash.rigs, 2)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                <p className="text-slate-500">Equipamentos</p>
                <p className="font-black text-cyan-300">{fmtNum(detalheHash.itens, 2)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                <p className="text-slate-500">Bônus</p>
                <p className="font-black text-emerald-300">+{fmtNum(detalheHash.bonusPct * 100, 0)}%</p>
              </div>
            </div>
          </div>

          {/* ---- BOTÃO DE CLIQUE ---- */}
          <div className="relative flex flex-col items-center justify-center">
            {mc.cliqueAtivo ? (
              <>
                <button
                  onClick={clicar}
                  className="group relative flex h-48 w-48 items-center justify-center rounded-full transition active:scale-90"
                >
                  <span className="absolute inset-0 animate-[girar_9s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,#f0abfc,#22d3ee,#fbbf24,#f0abfc)] opacity-80 blur-[2px]" />
                  <span className="absolute inset-[6px] rounded-full bg-slate-950" />
                  <span className="absolute inset-0 animate-ping rounded-full border border-fuchsia-400/30" />
                  <span className="relative text-7xl transition-transform duration-200 group-hover:rotate-12 group-active:scale-90">
                    ⛏️
                  </span>
                </button>
                <p className="mt-4 text-center text-sm text-slate-400">
                  Clique para minerar ·{" "}
                  <b className="text-amber-300">
                    {fmtMAS(mc.valorClique * (1 + (nivel - 1) * 0.05))}
                  </b>{" "}
                  por clique
                </p>
                <p className="text-[11px] text-slate-500">
                  {fmtNum(mc.chanceCritico * 100, 0)}% de chance de crítico ×{mc.multCritico} ·{" "}
                  {data.cliquesMinerados || 0} cliques
                </p>
                {pops.map((p) => (
                  <span
                    key={p.id}
                    className={`pointer-events-none absolute animate-[flutuar_0.9s_ease-out_forwards] text-lg font-black ${
                      p.crit ? "text-amber-300" : "text-emerald-300"
                    }`}
                    style={{ left: p.x, top: p.y }}
                  >
                    {p.crit ? "CRÍTICO " : ""}+{fmtNum(p.v, 2)}
                  </span>
                ))}
              </>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-8 text-center">
                <div className="text-5xl opacity-50">🚫</div>
                <p className="mt-3 font-bold text-white">Mineração por clique desativada</p>
                <p className="text-sm text-slate-400">A administração desabilitou este recurso.</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Estat emoji="⚡" titulo="Hashrate total" valor={fmtHS(hashrate)} cor="text-cyan-300" />
        <Estat emoji="💎" titulo="Total minerado" valor={fmtMAS(data.totalMinerado)} cor="text-emerald-300" />
        <Estat emoji="🖱️" titulo="Cliques" valor={fmtNum(data.cliquesMinerados || 0, 0)} />
        <Estat emoji="🏗️" titulo="Rigs ativas" valor={fmtNum(Object.values(data.rigs).reduce((a, b) => a + b, 0), 0)} />
      </div>

      <div>
        <h3 className="mb-3 text-lg font-black text-white">🏭 Fazenda de mineração</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cfg.rigs
            .filter((r) => r.ativo !== false)
            .map((r) => {
              const qtd = data.rigs[r.id] || 0;
              const custo = Math.round(r.preco * Math.pow(1.15, qtd));
              return (
                <Card key={r.id} hover className="flex flex-col p-4">
                  <div className="flex items-start justify-between">
                    <div className="text-4xl">{r.emoji}</div>
                    <Selo tom="violeta">x{qtd}</Selo>
                  </div>
                  <h4 className="mt-2 font-bold text-white">{r.nome}</h4>
                  <p className="text-xs text-slate-400">{r.desc}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-white/5 p-2">
                      <p className="text-slate-500">Potência</p>
                      <p className="font-bold text-cyan-300">{fmtHS(r.taxa)}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2">
                      <p className="text-slate-500">Energia</p>
                      <p className="font-bold text-amber-300">{r.energia} kW</p>
                    </div>
                  </div>
                  <Botao
                    className="mt-3 w-full"
                    disabled={data.saldo < custo}
                    onClick={() => comprarRig(r.id, r.preco, r.nome)}
                  >
                    Comprar · {fmtMAS(custo)}
                  </Botao>
                </Card>
              );
            })}
        </div>
      </div>
    </div>
  );
}
