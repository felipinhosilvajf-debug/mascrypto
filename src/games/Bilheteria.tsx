/**
 * 🎟️ Bilheteria de Blocos — Sorteio coletivo em tempo real
 * =========================================================
 * Regras:
 *  - 50 blocos numerados (1-50)
 *  - Custo = cfg.bilheteria.custoBilhete MAS + taxa da casa
 *  - Pote acumula a cada bilhete vendido
 *  - Quando o timer zera, um bloco aleatório é sorteado
 *  - Vencedor leva 100% do pote acumulado
 *  - Admin pode pausar, reiniciar ou encerrar
 */
import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, runTransaction } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useApp } from "../store/AppContext";
import { useConfig } from "../store/ConfigContext";
import { fmtMAS } from "../lib/economia";
import { Card, Selo, Vazio } from "../components/UI";

interface VencedorHist {
  rodada: number;
  bloco: number;
  premio: number;
  nome: string;
  uid: string;
  ts: number;
}

interface RodadaDoc {
  rodada: number;
  pote: number;
  bilhetes: Record<string, string[]>; // bloco -> [uid, uid, …]
  inicio: number;
  duracao: number;
  pausada: boolean;
  encerrada: boolean;
  sorteado?: number;
  vencedor?: { uid: string; nome: string; premio: number };
}

const REF_RODADA = () => doc(db, "bilheteria", "rodada_atual");

function rodadaVazia(cfg: any): RodadaDoc {
  return {
    rodada: cfg.bilheteria?.rodadaAtual ?? 1,
    pote: 0,
    bilhetes: {},
    inicio: Date.now(),
    duracao: cfg.bilheteria?.duracaoMs ?? 3600000,
    pausada: false,
    encerrada: false,
  };
}

export default function Bilheteria() {
  const { data, mover, toast } = useApp();
  const { cfg } = useConfig();
  const b = cfg.bilheteria;
  const [rodada, setRodada] = useState<RodadaDoc | null>(null);
  const [tempoRestante, setTempoRestante] = useState(0);
  const [comprando, setComprando] = useState<number | null>(null);
  const [historico, setHistorico] = useState<VencedorHist[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Histórico público de vencedores ── */
  useEffect(() => {
    let vivo = true;
    (async () => {
      const { collection, onSnapshot: onSnap, query, orderBy, limit } = await import("firebase/firestore");
      const q = query(collection(db, "bilheteria_historico"), orderBy("ts", "desc"), limit(10));
      const unsub = onSnap(q, (snap) => {
        if (vivo) setHistorico(snap.docs.map((d) => d.data() as VencedorHist));
      }, () => {});
      return unsub;
    })();
    return () => { vivo = false; };
  }, []);

  /* ── Escuta a rodada em tempo real ── */
  useEffect(() => {
    const unsub = onSnapshot(REF_RODADA(), (snap) => {
      if (snap.exists()) {
        setRodada(snap.data() as RodadaDoc);
      } else {
        // Cria a primeira rodada
        const nova = rodadaVazia(cfg);
        import("firebase/firestore").then(({ setDoc }) => setDoc(REF_RODADA(), nova).catch(() => {}));
        setRodada(nova);
      }
    });
    return unsub;
  }, []); // eslint-disable-line

  /* ── Timer local ── */
  useEffect(() => {
    if (!rodada || rodada.pausada || rodada.encerrada) return;
    const calcRestante = () => {
      const fim = rodada.inicio + rodada.duracao;
      return Math.max(0, fim - Date.now());
    };
    setTempoRestante(calcRestante());
    timerRef.current = setInterval(() => {
      const r = calcRestante();
      setTempoRestante(r);
      if (r <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
        // Aciona o sorteio automático quando o timer zera
        sortearAuto();
      }
    }, 500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [rodada?.inicio, rodada?.duracao, rodada?.pausada, rodada?.encerrada]); // eslint-disable-line

  const comprarBilhete = async (bloco: number) => {
    if (!data || !rodada || rodada.encerrada || rodada.pausada) return;
    
    // Regra: Máximo de 1 bilhete por pessoa
    const jaTemBilhete = Object.values(rodada.bilhetes).some((ids) => ids.includes(data.uid));
    if (jaTemBilhete) return toast("Você já comprou um bilhete para esta rodada! Limite de 1 por pessoa 🎟️", "erro");

    // Limite máximo de 50 participantes
    const totalVendidos = Object.values(rodada.bilhetes).reduce((sum, list) => sum + list.length, 0);
    if (totalVendidos >= 50) return toast("Sorteio lotado! Máximo de 50 participantes.", "erro");

    const custo = b.custoBilhete + b.taxaCasa;
    if (data.saldo < custo) return toast(`Saldo insuficiente — necessário ${fmtMAS(custo)}`, "erro");

    setComprando(bloco);
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(REF_RODADA());
        const atual: RodadaDoc = snap.exists() ? snap.data() as RodadaDoc : rodadaVazia(cfg);
        
        // Bloqueia se o bloco já foi comprado por outra pessoa (Regra: Bloco por sorteio só pode ser comprado uma vez)
        const lista = atual.bilhetes[bloco] ?? [];
        if (lista.length > 0) throw new Error("Este bloco já foi comprado por outro participante!");

        const novaLista = [...lista, data.uid];
        const novoPote = atual.pote + b.custoBilhete;
        tx.set(REF_RODADA(), {
          ...atual,
          bilhetes: { ...atual.bilhetes, [bloco]: novaLista },
          pote: novoPote,
        });
      });
      // Debita saldo localmente (otimista)
      mover({ mas: -custo, titulo: "Bilheteria · Bilhete", detalhe: `Bloco ${bloco}`, xp: 5 });
      toast(`Bloco ${bloco} comprado! Boa sorte 🎟️`, "ok");
    } catch (e: any) {
      toast(e.message || "Erro ao comprar bilhete", "erro");
    } finally {
      setComprando(null);
    }
  };

  const sortearAuto = async () => {
    if (!rodada || rodada.encerrada) return;
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(REF_RODADA());
        if (!snap.exists()) return;
        const r = snap.data() as RodadaDoc;
        if (r.encerrada) return;
        const blocos = Object.keys(r.bilhetes).filter((b) => r.bilhetes[b].length > 0);
        if (blocos.length === 0) {
          // Ninguém comprou: reinicia a rodada
          tx.set(REF_RODADA(), { ...r, encerrada: true, sorteado: -1 });
          return;
        }
        const blocoSorteado = parseInt(blocos[Math.floor(Math.random() * blocos.length)]);
        const participantes = r.bilhetes[blocoSorteado];
        const vencedorUid = participantes[Math.floor(Math.random() * participantes.length)];
        tx.set(REF_RODADA(), {
          ...r,
          encerrada: true,
          sorteado: blocoSorteado,
          vencedor: { uid: vencedorUid, nome: "Sortudo", premio: r.pote },
        });
      });
    } catch {
      // sem conexão — será resincronizado pelo onSnapshot
    }
  };

  if (!b.ativa)
    return (
      <Card className="py-12 text-center">
        <div className="text-5xl opacity-50">🎟️</div>
        <p className="mt-3 font-black text-white">Bilheteria desativada</p>
        <p className="text-sm text-slate-400">A administração fechou temporariamente a bilheteria.</p>
      </Card>
    );

  const meusBlocos = rodada
    ? Object.entries(rodada.bilhetes)
        .filter(([, ids]) => ids.includes(data?.uid ?? ""))
        .map(([n]) => parseInt(n))
    : [];

  const blocoSorteado = rodada?.sorteado;
  const totalSeg = Math.max(0, Math.floor(tempoRestante / 1000));
  const dd = Math.floor(totalSeg / 86400);
  const hh = Math.floor((totalSeg % 86400) / 3600);
  const mm = Math.floor((totalSeg % 3600) / 60);
  const ss = totalSeg % 60;
  const p2 = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="space-y-4">
      {/* Header do jogo */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-[radial-gradient(120%_140%_at_50%_0%,rgba(251,191,36,0.18),transparent_55%)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">
              🎟️ Bilheteria de Blocos
              <span className="ml-2 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-sm text-amber-300">DESTAQUE</span>
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Escolha um bloco · {fmtMAS(b.custoBilhete + b.taxaCasa)} por bilhete · Vencedor leva 100% do pote
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-300/80">Pote Atual</p>
            <p className="text-3xl font-black text-amber-300 drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]">
              {fmtMAS(rodada?.pote ?? 0)}
            </p>
          </div>
        </div>

        {/* Timer profissional sincronizado */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-300/80">
                ⏱ Próximo sorteio em
              </p>
              {rodada?.encerrada ? (
                <p className="mt-1 text-2xl font-black text-rose-400">Rodada encerrada</p>
              ) : rodada?.pausada ? (
                <p className="mt-1 text-2xl font-black text-amber-400">⏸ Pausado pelo Admin</p>
              ) : (
                <div className="mt-2 flex gap-2">
                  {([
                    ["Dias", dd],
                    ["Horas", hh],
                    ["Min", mm],
                    ["Seg", ss],
                  ] as [string, number][]).map(([rot, val]) => (
                    <div
                      key={rot}
                      className="min-w-[58px] rounded-xl border border-amber-400/30 bg-amber-400/10 px-2 py-1.5 text-center"
                    >
                      <p className="font-mono text-2xl font-black leading-none text-white">{p2(val)}</p>
                      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300/70">{rot}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right">
              <Selo tom="ouro">Rodada #{rodada?.rodada ?? 1}</Selo>
              <p className="mt-1.5 text-xs text-slate-400">
                {Object.keys(rodada?.bilhetes ?? {}).length}/50 blocos vendidos
              </p>
              <p className="text-[10px] text-slate-500">Sincronizado com o servidor</p>
            </div>
          </div>
        </div>

        {/* Resultado do sorteio */}
        {rodada?.encerrada && blocoSorteado !== undefined && blocoSorteado >= 0 && (
          <div className="mt-3 rounded-2xl border border-amber-400/60 bg-amber-400/15 p-3 text-center animate-[winBurst_0.5s_ease-out]">
            <p className="text-sm text-amber-200">🏆 Bloco sorteado: <b className="text-2xl text-white">{blocoSorteado}</b></p>
            {rodada.vencedor && (
              <p className="text-xs text-amber-300 mt-1">
                Vencedor: <b>{rodada.vencedor.uid === data?.uid ? "VOCÊ! 🎉" : "Outro jogador"}</b> · Prêmio: {fmtMAS(rodada.vencedor.premio)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Grade de 50 blocos */}
      <Card className="p-4">
        <p className="mb-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
          Selecione um bloco para comprar seu bilhete
          {meusBlocos.length > 0 && <span className="ml-2 text-fuchsia-300">· Seus blocos: {meusBlocos.join(", ")}</span>}
        </p>
        <div className="grid grid-cols-10 gap-1.5">
          {Array.from({ length: 50 }, (_, i) => {
            const num = i + 1;
            const donos = rodada?.bilhetes[num] ?? [];
            const meuBloco = meusBlocos.includes(num);
            const foiSorteado = blocoSorteado === num;
            const vendido = donos.length > 0;

            const outroComprou = vendido && !meuBloco;

            return (
              <button
                key={num}
                disabled={!!(rodada?.encerrada || rodada?.pausada || comprando !== null || outroComprou)}
                onClick={() => comprarBilhete(num)}
                className={`flex flex-col items-center justify-center rounded-xl border p-2 text-xs font-black transition-all duration-200 active:scale-90 ${
                  foiSorteado
                    ? "animate-[jackpotShake_0.6s_ease-out] border-amber-400 bg-amber-400/30 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.8)]"
                    : meuBloco
                      ? "border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-200"
                      : outroComprou
                        ? "border-white/5 bg-white/5 text-slate-600 cursor-not-allowed opacity-35"
                        : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-amber-400/50 hover:bg-amber-400/10 hover:text-white"
                }`}
              >
                <span>{num}</span>
                {outroComprou ? (
                  <span className="mt-0.5 text-[6px] font-black text-rose-500 uppercase">Bloq</span>
                ) : meuBloco ? (
                  <span className="mt-0.5 text-[6px] font-black text-emerald-400 uppercase">Seu</span>
                ) : (
                  <span className="mt-0.5 text-[6px] font-bold text-slate-500 uppercase">Livre</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-fuchsia-400 bg-fuchsia-500/20" /> Seu bilhete (máx 1)</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-white/5 bg-white/5" /> Indisponível (comprado por outro)</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-white/10 bg-white/[0.04]" /> Livre para compra</span>
        </div>
      </Card>

      {/* ── Painel público de resultados ── */}
      <Card className="border-amber-400/25">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-black text-white">
            🏆 Mural de Vencedores
          </h3>
          <Selo tom="ouro">Últimos {historico.length} sorteios</Selo>
        </div>

        {historico.length === 0 ? (
          <Vazio emoji="🎟️" titulo="Nenhum sorteio concluído" texto="O primeiro vencedor aparecerá aqui." />
        ) : (
          <div className="space-y-2">
            {historico.map((h, idx) => {
              const souEu = h.uid === data?.uid;
              return (
                <div
                  key={`${h.rodada}-${h.ts}`}
                  className={`flex flex-wrap items-center gap-3 rounded-2xl border p-3 ${
                    idx === 0
                      ? "border-amber-400/50 bg-amber-400/10 shadow-[0_0_22px_-10px_rgba(251,191,36,.9)]"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black ${
                    idx === 0 ? "bg-amber-400 text-slate-950" : "bg-white/10 text-slate-300"
                  }`}>
                    {idx === 0 ? "👑" : `#${h.rodada}`}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-white">
                      {souEu ? "VOCÊ 🎉" : h.nome}
                      {idx === 0 && <span className="ml-2 text-[10px] font-black uppercase text-amber-300">Mais recente</span>}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Rodada #{h.rodada} · Bloco sorteado <b className="text-amber-300">{h.bloco}</b> ·{" "}
                      {new Date(h.ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Pote</p>
                    <p className="font-black text-emerald-300">{fmtMAS(h.premio)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
