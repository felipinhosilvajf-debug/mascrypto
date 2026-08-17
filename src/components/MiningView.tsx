import { useEffect, useRef, useState } from "react";
import { useApp } from "../store/AppContext";
import { useConfig } from "../store/ConfigContext";
import { fmtBRL, fmtDinamico, fmtHS, fmtMAS, fmtNum, nivelPorXp } from "../lib/economia";
import { Barra, Botao, Card, Estat, Selo, Sparkline } from "./UI";

export default function MiningView() {
  const {
    data,
    minerarClique,
    hashrate,
    detalheHash,
    precoMAS,
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
    historicoPreco,
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

    // Animação/toast do clique usa a precisão dinâmica (3 casas ou mais)
    // para nunca exibir um valor residual como 0,00.
    const r = e.currentTarget.getBoundingClientRect();
    const id = agora + Math.random();
    setPops((p) => [
      ...p.slice(-12),
      { id, x: e.clientX - r.left, y: e.clientY - r.top, v, crit },
    ]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 900);
    toast(
      `+${fmtDinamico(v)} MAS${crit ? " 🔥 crítico!" : ""}`,
      "info",
    );
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
              A Ring automática da rede e seus equipamentos mineram enquanto sua sessão está ativa.
              Capacidade máxima acumulada: {mc.capHoras}h.
            </p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pendente para coleta</p>
                  <p className="text-4xl font-black text-emerald-400">{fmtDinamico(pendente)} MAS</p>
                  {minerandoAtivo && hashrate > 0 && (
                    <p className="mt-1 text-[11px] text-emerald-300/70">
                      +{fmtHS(hashrate)} por segundo
                    </p>
                  )}
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
                <span>Cotação: <b className="text-sky-300">{fmtBRL(precoMAS)}</b>/MAS</span>
              </div>

              {/* ── Projeção de rendimento com conversão em BRL (CardProjecao) ── */}
              {mc.cardProjecao !== false && (
                <div className="mt-3 grid grid-cols-3 gap-2 animate-[subir_0.3s_ease-out]">
                  {([
                    ["Por hora", hashrate * 3600],
                    ["Por dia",  hashrate * 86400],
                    ["Acumulado", data.totalMinerado],
                  ] as [string, number][]).map(([rot, val]) => (
                    <div key={rot} className="rounded-xl border border-white/10 bg-white/5 p-2 text-center">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{rot}</p>
                      <p className="text-[13px] font-black text-emerald-300">{fmtDinamico(val)}</p>
                      <p className="text-[10px] font-bold text-sky-300">{fmtBRL(val * precoMAS)}</p>
                    </div>
                  ))}
                </div>
              )}
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
                <Botao
                  variante="sucesso"
                  onClick={coletar}
                  disabled={pendente <= 0}
                  title={pendente > 0 ? "Coletar qualquer valor maior que zero" : "Nada para coletar ainda"}
                >
                  Coletar {fmtDinamico(pendente)} MAS
                </Botao>
                {mc.boostAtivo && (
                  <button
                    disabled={boostAtivo || data.saldo < mc.boostPreco}
                    onClick={ativarBoost}
                    className="relative rounded-xl px-4 py-2.5 text-sm font-bold text-slate-950 transition-all duration-200 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      background: `linear-gradient(110deg, ${mc.boostCor}, ${mc.boostCor}cc)`,
                      boxShadow: `0 6px 24px -8px ${mc.boostCor}`,
                    }}
                  >
                    {boostAtivo
                      ? `🔥 Ativo · ${Math.ceil((boostAte - Date.now()) / 1000)}s`
                      : `⚡ Boost x${mc.boostMult} (${fmtMAS(mc.boostPreco)})`}
                  </button>
                )}
                <span
                  className={`inline-flex items-center rounded-xl border px-4 py-2.5 text-sm font-black ${
                    mc.ringAtiva !== false
                      ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-300"
                      : "border-rose-400/40 bg-rose-500/15 text-rose-300"
                  }`}
                  title={mc.ringDesc || "Ring automática da rede MAScrypto"}
                >
                  {mc.ringAtiva !== false ? "⚡ Ring Ativada" : "🔴 Ring Indisponível"}
                </span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.05] p-2.5">
                <p className="text-[10px] text-slate-500">GPUs Instaladas</p>
                <p className="font-black text-cyan-300">
                  {Object.keys(data.slotsHardware || {}).length} <span className="text-[9px] text-slate-500">unidades</span>
                </p>
                <p className="text-[9px] text-cyan-200/80">+{fmtHS(detalheHash.hardwareSlots)}</p>
              </div>

              {/* ── PAINEL TECNOLÓGICO DE MINERAÇÃO (Animação Dinâmica) ── */}
              <div className="col-span-2 relative flex items-center justify-between overflow-hidden rounded-xl border border-fuchsia-500/20 bg-[#060411] p-2.5 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(217,70,239,.2)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.2)_1px,transparent_1px)] [background-size:12px_12px]" />
                
                <div className="relative flex items-center gap-3 text-left">
                  {/* Núcleo rotativo sincronizado com o Hashrate */}
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                    <div
                      className="absolute inset-1 rounded-full border-2 border-dashed border-cyan-400/70 transition-all"
                      style={{
                        animation: minerandoAtivo ? `girar ${Math.max(1, 10 - hashrate)}s linear infinite` : "none",
                        opacity: minerandoAtivo ? 1 : 0.3
                      }}
                    />
                    <div
                      className="absolute inset-2 rounded-full border border-fuchsia-400/50 transition-all"
                      style={{
                        animation: minerandoAtivo ? `girar ${Math.max(0.5, 5 - hashrate * 0.5)}s linear infinite reverse` : "none",
                        opacity: minerandoAtivo ? 1 : 0.3
                      }}
                    />
                    <span className="relative z-10 text-[10px] font-black text-white">{minerandoAtivo ? "ON" : "OFF"}</span>
                  </div>

                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Núcleo MAS</p>
                    <div className="mt-0.5 flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className="h-1.5 w-3 rounded-sm transition-all duration-300"
                          style={{
                            backgroundColor: minerandoAtivo
                              ? i < Math.min(5, Math.ceil(hashrate * 2))
                                ? "#22d3ee" // Aceso (Cyan)
                                : "#475569" // Apagado
                              : "#1e293b",
                            boxShadow: minerandoAtivo && i < Math.min(5, Math.ceil(hashrate * 2)) ? "0 0 8px #22d3ee" : "none",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="relative text-right">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Bônus</p>
                  <p className="font-black text-emerald-300">+{fmtNum(detalheHash.bonusPct * 100, 0)}%</p>
                </div>
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
                  <span className="relative text-7xl transition-transform duration-200 group-hover:rotate-12 group-active:scale-90">
                    ⛏️
                  </span>
                </button>
                <p className="mt-4 text-center text-sm text-slate-400">
                  Clique para minerar ·{" "}
                  <b className="text-amber-300">
                    {fmtDinamico(mc.valorClique * (1 + (nivel - 1) * 0.05))} MAS
                  </b>
                  {" "}por clique
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
                    {p.crit ? "CRÍTICO " : ""}+{fmtDinamico(p.v)} MAS
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

      <Card className="border-cyan-500/20 bg-cyan-500/[0.04]">
        <h3 className="font-black text-white">Como funciona a Ring Automática?</h3>
        <div className="mt-3 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
            <p className="font-black text-cyan-300">⚡ Unidade padrão</p>
            <p className="mt-1 text-xs leading-relaxed">
              A Ring é a unidade de processamento de mineração padrão da rede MAScrypto. Ela é invisível e automática.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
            <p className="font-black text-emerald-300">✅ Começa com você</p>
            <p className="mt-1 text-xs leading-relaxed">
              Mesmo sem comprar itens ou cadastrar equipamentos, todo usuário já começa minerando com a Ring disponível após o cadastro.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
            <p className="font-black text-amber-300">🛒 Itens somam potência</p>
            <p className="mt-1 text-xs leading-relaxed">
              GPUs, periféricos e itens comprados na Loja adicionam H/s sobre a base da Ring automática.
            </p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          Ring atual: <b className="text-white">{mc.ringNome || "Ring MAS"}</b> · Base: <b className="text-cyan-300">{fmtHS(mc.ringAtiva !== false ? mc.ringHashrate || 0 : 0)}</b>
        </p>
      </Card>

      {/* ── SEÇÃO: Novas Métricas/Cards Dinâmicos Configuráveis pelo Admin ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Animação Cyber/Pixel de Computadores Minerando */}
        {mc.cardAnimacaoPixel !== false && (
          <Card glow className="border-cyan-500/25 bg-[#0c081f] p-4 flex flex-col justify-between h-[230px] overflow-hidden relative">
            <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-cyan-500/10 blur-2xl" />
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="text-lg">🖥️</span> Rig Console (Pixel Art)
              </h4>
              <Selo tom="ciano">Ativo</Selo>
            </div>
            
            <div className="flex-1 flex items-center gap-4 mt-3">
              {/* Gabinete pixelado animado */}
              <div className="relative shrink-0 h-24 w-20 border-2 border-slate-700 bg-slate-900 rounded-lg p-1.5 flex flex-col justify-between shadow-[0_0_15px_-4px_rgba(34,211,238,0.7)]">
                {/* Screen */}
                <div className="h-8 rounded bg-emerald-950/80 border border-slate-800 p-0.5 flex flex-col justify-around overflow-hidden relative">
                  <span className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                  <span className="h-0.5 bg-emerald-400 w-full animate-pulse" />
                  <div className="flex justify-around">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                  </div>
                </div>
                {/* Fans */}
                <div className="flex justify-around items-center mt-1">
                  <div className="h-8 w-8 rounded-full border border-slate-700 bg-slate-950 flex items-center justify-center relative">
                    <span 
                      className="absolute inset-1 rounded-full border-t border-b border-cyan-400"
                      style={{ animation: minerandoAtivo ? `girar ${Math.max(0.2, 3 - hashrate)}s linear infinite` : "none" }}
                    />
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                  </div>
                  {/* LEDs */}
                  <div className="flex flex-col gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${minerandoAtivo ? "bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" : "bg-slate-700"}`} />
                    <span className={`h-1.5 w-1.5 rounded-full ${minerandoAtivo ? "bg-fuchsia-400 animate-pulse shadow-[0_0_8px_#d946ef]" : "bg-slate-700"}`} style={{ animationDelay: "0.2s" }} />
                    <span className={`h-1.5 w-1.5 rounded-full ${minerandoAtivo ? "bg-amber-400 animate-pulse shadow-[0_0_8px_#fbbf24]" : "bg-slate-700"}`} style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              </div>

              {/* Scrolling Console logs */}
              <div className="flex-1 h-24 rounded-lg bg-black/50 border border-white/5 font-mono text-[9px] text-emerald-400 p-2 overflow-hidden flex flex-col justify-end space-y-0.5">
                <p className="opacity-40">&gt; mas_miner_v8.32_init</p>
                <p className="opacity-60">&gt; node_connected: mas1_ledger</p>
                <p className="opacity-80 animate-pulse">&gt; shares_submitted: +{fmtDinamico(hashrate * 0.1)} H/s</p>
                <p className="font-bold text-cyan-300 animate-[pulsar_1.5s_infinite]">&gt; ring_hashrate: {fmtHS(hashrate)} [ONLINE]</p>
              </div>
            </div>
          </Card>
        )}

        {/* Gráfico de Cotação MAS/BRL ao vivo */}
        {mc.cardGraficoCotacao !== false && (
          <Card glow className="border-sky-500/25 p-4 flex flex-col justify-between h-[230px] overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>📈</span> MAS / BRL ao vivo
              </h4>
              <Selo tom="verde">Cotação</Selo>
            </div>
            <div className="flex-1 flex flex-col justify-center mt-3">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-xl font-black text-white">{fmtBRL(precoMAS)}</span>
                <span className="text-xs font-bold text-emerald-300">RTP Sincronizado</span>
              </div>
              <div className="h-20">
                <Sparkline dados={historicoPreco} cor="#22d3ee" />
              </div>
            </div>
          </Card>
        )}

        {/* Número de Mineração Completo (Algoritmos) */}
        {mc.cardNumeroMineracao !== false && (
          <Card glow className="border-fuchsia-500/25 col-span-full p-4">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
              <span>🧮</span> Protocolos e Algoritmos de Hashrate
            </h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-5 text-xs">
              {[
                { nome: "SHA-256 (MAS)", pct: 35, cor: "text-amber-300 border-amber-500/20" },
                { nome: "Scrypt (Aux)",  pct: 25, cor: "text-cyan-300 border-cyan-500/20" },
                { nome: "Ethash",        pct: 20, cor: "text-fuchsia-300 border-fuchsia-500/20" },
                { nome: "X11 Chain",     pct: 10, cor: "text-sky-300 border-sky-500/20" },
                { nome: "Cryptonight",   pct: 10, cor: "text-rose-300 border-rose-500/20" },
              ].map((algo) => {
                const share = hashrate * (algo.pct / 100);
                return (
                  <div key={algo.nome} className={`rounded-xl border p-2.5 bg-black/35 text-center ${algo.cor}`}>
                    <p className="text-[10px] font-bold uppercase text-slate-500">{algo.nome}</p>
                    <p className="font-black mt-1">{fmtHS(share)}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{algo.pct}% share</p>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Estat emoji="⚡" titulo="Hashrate total" valor={fmtHS(hashrate)} cor="text-cyan-300" />
        <Estat emoji="💎" titulo="Total minerado" valor={fmtMAS(data.totalMinerado)} cor="text-emerald-300" />
        <Estat emoji="🖱️" titulo="Cliques" valor={fmtNum(data.cliquesMinerados || 0, 0)} />
      </div>
    </div>
  );
}
