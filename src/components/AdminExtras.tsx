/**
 * Componentes de administração extras:
 *  - RecompensaAdmin — configura prêmios diários
 *  - BilheteriaAdmin — controla rodadas/timer da bilheteria
 * 
 * Exportados e usados em AdminView.tsx
 */
import { useState } from "react";
import { useApp } from "../store/AppContext";
import { useConfig } from "../store/ConfigContext";
import { fmtMAS } from "../lib/economia";
import { Botao, Campo, Card, Input, Switch } from "./UI";

export function RecompensaAdmin() {
  const { cfg, salvarConfig } = useConfig();
  const { toast } = useApp();
  const r = cfg.recompensaDiaria;
  const [premiosStr, setPremiosStr] = useState(r.premios.join(", "));

  const salvar = () => {
    try {
      const arr = premiosStr
        .split(",")
        .map((v) => Math.max(1, Math.round(parseFloat(v.trim()))))
        .filter((v) => !isNaN(v));
      if (arr.length < 1) throw new Error("Informe ao menos 1 valor");
      salvarConfig({ recompensaDiaria: { ...r, premios: arr } });
      toast("Recompensa diária atualizada ✅", "ok");
    } catch (e: unknown) {
      toast((e as Error).message, "erro");
    }
  };

  return (
    <div className="space-y-4">
      <Card glow className="border-amber-500/25">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-white">🎁 Configuração da Recompensa Diária</h3>
            <p className="text-sm text-slate-400">
              Configure os prêmios em MAS para cada dia de streak consecutivo.
              Índice 0 = Dia 1, índice 6 = Dia 7.
            </p>
          </div>
          <Switch
            ligado={r.ativa}
            onChange={(v) => {
              salvarConfig({ recompensaDiaria: { ...r, ativa: v } });
              toast(v ? "Recompensa diária ativada" : "Desativada", v ? "ok" : "info");
            }}
            rotulo={r.ativa ? "Ativada" : "Desativada"}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Campo
            label="Valores por dia de streak (vírgula)"
            dica="Ex: 150, 300, 500, 800, 1200, 2000, 5000"
          >
            <Input
              value={premiosStr}
              onChange={(e) => setPremiosStr(e.target.value)}
              placeholder="150, 300, 500, 800, 1200, 2000, 5000"
            />
          </Campo>
          <div className="flex items-end">
            <Botao variante="sucesso" onClick={salvar}>
              Salvar prêmios
            </Botao>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2">
          {r.premios.map((v, i) => (
            <div
              key={i}
              className={`rounded-xl border p-2 text-center ${
                i === r.premios.length - 1
                  ? "border-amber-400/60 bg-amber-400/15"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <p className="text-[10px] text-slate-500">Dia {i + 1}</p>
              <p className="text-xs font-black text-white">{fmtMAS(v)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function BilheteriaAdmin() {
  const { cfg, salvarConfig } = useConfig();
  const { toast } = useApp();
  const b = cfg.bilheteria;
  const set = (patch: Partial<typeof b>) => salvarConfig({ bilheteria: { ...b, ...patch } });

  const duracoes = [
    { label: "30 min", ms: 30 * 60 * 1000 },
    { label: "1 hora", ms: 60 * 60 * 1000 },
    { label: "2 horas", ms: 2 * 60 * 60 * 1000 },
    { label: "4 horas", ms: 4 * 60 * 60 * 1000 },
    { label: "6 horas", ms: 6 * 60 * 60 * 1000 },
    { label: "12 horas", ms: 12 * 60 * 60 * 1000 },
    { label: "24 horas", ms: 24 * 60 * 60 * 1000 },
  ];

  const fbOp = async (fn: (mods: typeof import("firebase/firestore")) => Promise<void>) => {
    const mods = await import("firebase/firestore");
    await fn(mods).catch(() => toast("Sem acesso ao banco", "erro"));
  };

  const reiniciar = () =>
    fbOp(async ({ setDoc, doc }) => {
      const { db } = await import("../lib/firebase");
      await setDoc(doc(db, "bilheteria", "rodada_atual"), {
        rodada: (b.rodadaAtual ?? 1) + 1,
        pote: 0,
        bilhetes: {},
        inicio: Date.now(),
        duracao: b.duracaoMs,
        pausada: false,
        encerrada: false,
      });
      set({ rodadaAtual: (b.rodadaAtual ?? 1) + 1, poteAtual: 0 });
      toast("Nova rodada iniciada! 🎟️", "ok");
    });

  const pausar = () =>
    fbOp(async ({ updateDoc, doc }) => {
      const { db } = await import("../lib/firebase");
      await updateDoc(doc(db, "bilheteria", "rodada_atual"), { pausada: !b.pausada });
      toast(b.pausada ? "Bilheteria retomada" : "Bilheteria pausada", "info");
    });

  /**
   * Encerra a rodada AGORA: sorteia um bloco vendido, define o vencedor e
   * credita 100% do pote na carteira dele — tudo em uma transação atômica.
   */
  const encerrar = () =>
    fbOp(async ({ runTransaction, doc }) => {
      const { db } = await import("../lib/firebase");
      const { normalizar } = await import("../lib/types");

      const resultado = await runTransaction(db, async (tx) => {
        const rRef = doc(db, "bilheteria", "rodada_atual");
        const snap = await tx.get(rRef);
        if (!snap.exists()) throw new Error("Nenhuma rodada ativa");
        const r = snap.data() as {
          rodada: number;
          pote: number;
          bilhetes: Record<string, string[]>;
          encerrada: boolean;
        };
        if (r.encerrada) throw new Error("Rodada já encerrada");

        const vendidos = Object.keys(r.bilhetes || {}).filter((k) => (r.bilhetes[k] || []).length > 0);
        if (vendidos.length === 0) {
          tx.set(rRef, { ...r, encerrada: true, sorteado: -1 });
          return { semBilhetes: true, bloco: -1, premio: 0, nome: "" };
        }

        const bloco = Number(vendidos[Math.floor(Math.random() * vendidos.length)]);
        const uidVencedor = r.bilhetes[bloco][0];
        const premio = r.pote || 0;

        // Credita o prêmio na carteira do vencedor
        const uRef = doc(db, "users", uidVencedor);
        const uSnap = await tx.get(uRef);
        let nome = "Jogador";
        if (uSnap.exists()) {
          const u = normalizar(uSnap.data() as Record<string, unknown>, uidVencedor);
          nome = u.nome;
          tx.set(uRef, {
            ...u,
            saldo: u.saldo + premio,
            historico: [
              {
                t: "Bilheteria · Prêmio",
                v: premio,
                d: `Bloco ${bloco} · rodada #${r.rodada}`,
                ts: Date.now(),
                moeda: "MAS" as const,
              },
              ...u.historico,
            ].slice(0, 60),
            adminRev: (u.adminRev || 0) + 1,
            atualizadoEm: Date.now(),
          });
        }

        tx.set(rRef, {
          ...r,
          encerrada: true,
          pausada: false,
          sorteado: bloco,
          vencedor: { uid: uidVencedor, nome, premio },
        });
        return { semBilhetes: false, bloco, premio, nome };
      });

      if (resultado.semBilhetes) {
        toast("Rodada encerrada — nenhum bilhete vendido", "info");
      } else {
        toast(
          `🎯 Bloco ${resultado.bloco} sorteado! ${resultado.nome} recebeu ${fmtMAS(resultado.premio)}`,
          "ok",
        );
      }
      window.dispatchEvent(new Event("balanceUpdate"));
    });

  return (
    <div className="space-y-4">
      <Card glow className="border-amber-500/25">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-white">🎟️ Controles da Bilheteria de Blocos</h3>
            <p className="text-sm text-slate-400">
              Gerencie rodadas, configure o timer e pause ou encerre a bilheteria em tempo real.
            </p>
          </div>
          <Switch
            ligado={b.ativa}
            onChange={(v) => {
              set({ ativa: v });
              toast(v ? "Bilheteria ativada" : "Bilheteria desativada", v ? "ok" : "info");
            }}
            rotulo={b.ativa ? "Ativada" : "Desativada"}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo label="Custo do bilhete (MAS)">
            <Input
              type="number"
              min={0.5}
              step={0.5}
              value={b.custoBilhete}
              onChange={(e) => set({ custoBilhete: Math.max(0.5, Number(e.target.value)) })}
            />
          </Campo>
          <Campo label="Taxa da casa (MAS por bilhete)">
            <Input
              type="number"
              min={0}
              step={0.1}
              value={b.taxaCasa}
              onChange={(e) => set({ taxaCasa: Math.max(0, Number(e.target.value)) })}
            />
          </Campo>
          <Campo label="Duração da rodada">
            <select
              value={b.duracaoMs}
              onChange={(e) => set({ duracaoMs: Number(e.target.value) })}
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none"
            >
              {duracoes.map((d) => (
                <option key={d.ms} value={d.ms}>
                  {d.label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Total de blocos (fixo)">
            <Input type="number" disabled value={50} />
          </Campo>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Botao variante="sucesso" className="py-3" onClick={reiniciar}>
          🔄 Iniciar nova rodada
        </Botao>
        <Botao variante="ouro" className="py-3" onClick={pausar}>
          {b.pausada ? "▶ Retomar rodada" : "⏸ Pausar rodada"}
        </Botao>
        <Botao variante="perigo" className="py-3" onClick={encerrar}>
          🎯 Encerrar e sortear agora
        </Botao>
      </div>

      <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.07] p-3 text-xs text-amber-200/90">
        <b>Encerrar e sortear agora:</b> finaliza a rodada imediatamente, sorteia um dos blocos vendidos, anuncia o
        vencedor e credita <b>100% do pote</b> na carteira dele automaticamente (transação atômica).
      </div>
    </div>
  );
}
