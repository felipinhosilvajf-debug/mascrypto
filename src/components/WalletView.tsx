import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useApp } from "../store/AppContext";
import { useConfig } from "../store/ConfigContext";
import {
  COLECAO_PAGAMENTOS,
  DEPOSITO_MINIMO,
  SAQUE_MINIMO,
  solicitarDepositoManual,
  solicitarSaqueManual,
  type DestinoDeposito,
  type PagamentoManual,
} from "../lib/pagamentos";
import { fmtBRL, fmtMAS, fmtNum } from "../lib/economia";
import { Abas, Botao, Campo, Card, GraficoStatus, Input, Selo, Sparkline, Textarea, Vazio } from "./UI";

type Aba = "converter" | "depositar" | "sacar" | "pedidos" | "extrato";

const STATUS = {
  pendente: { label: "Em análise", tom: "ouro" as const, icone: "⌛" },
  aprovado: { label: "Aprovado", tom: "verde" as const, icone: "✓" },
  recusado: { label: "Recusado", tom: "vermelho" as const, icone: "×" },
};

export default function WalletView() {
  const { user, data, mover, precoMAS, precoMASBase, historicoPreco, proximoTickMs, toast } = useApp();
  const { cfg } = useConfig();
  const [aba, setAba] = useState<Aba>("converter");
  const [direcao, setDirecao] = useState<"MAS_BRL" | "BRL_MAS">("MAS_BRL");
  const [valorConversao, setValorConversao] = useState(10);
  const [valorDeposito, setValorDeposito] = useState(DEPOSITO_MINIMO);
  const [destinoDeposito, setDestinoDeposito] = useState<DestinoDeposito>("BRL");
  const [comprovante, setComprovante] = useState("");
  const [observacao, setObservacao] = useState("");
  const [valorSaque, setValorSaque] = useState(SAQUE_MINIMO);
  const [chavePix, setChavePix] = useState("");
  const [pedidos, setPedidos] = useState<PagamentoManual[]>([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, COLECAO_PAGAMENTOS), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const lista = snap.docs
        .map((d) => d.data() as PagamentoManual)
        .sort((a, b) => b.criadoEm - a.criadoEm);
      setPedidos(lista);
    });
    return unsub;
  }, [user, toast]);

  if (!data || !user) return null;

  const taxa = cfg.taxaConversao;
  const depositoMinimo = cfg.depositoMinimo ?? DEPOSITO_MINIMO;
  const saqueMinimo = cfg.saqueMinimo ?? SAQUE_MINIMO;
  const bruto = Math.max(0, Number(valorConversao) || 0);
  // conversões financeiras usam precoMASBase (âncora estável, sem oscilação visual)
  const taxaValor = direcao === "MAS_BRL" ? bruto * precoMASBase * taxa : bruto * taxa;
  const liquido =
    direcao === "MAS_BRL"
      ? bruto * precoMASBase * (1 - taxa)
      : (bruto * (1 - taxa)) / Math.max(0.01, precoMASBase);
  const saldoOrigem = direcao === "MAS_BRL" ? data.saldo : data.brl;
  const variacao = historicoPreco.length > 1 ? ((precoMAS - historicoPreco[0]) / historicoPreco[0]) * 100 : 0;

  const converter = () => {
    if (bruto <= 0) return toast("Informe um valor válido", "erro");
    if (bruto > saldoOrigem) return toast("Saldo insuficiente", "erro");
    const ok =
      direcao === "MAS_BRL"
        ? mover({ mas: -bruto, brl: liquido, titulo: "Conversão MAS → BRL", detalhe: `${fmtMAS(bruto)} por ${fmtBRL(liquido)}`, xp: 5 })
        : mover({ brl: -bruto, mas: liquido, titulo: "Conversão BRL → MAS", detalhe: `${fmtBRL(bruto)} por ${fmtMAS(liquido)}`, xp: 5 });
    if (ok) toast(`Conversão concluída: você recebeu ${direcao === "MAS_BRL" ? fmtBRL(liquido) : fmtMAS(liquido)}`, "ok");
  };

  const depositar = async () => {
    if (valorDeposito < depositoMinimo) return toast(`Depósito mínimo: ${fmtBRL(depositoMinimo)}`, "erro");
    setEnviando(true);
    try {
      await solicitarDepositoManual({ uid: user.uid, nome: data.nome, email: data.email, valorBRL: valorDeposito, destino: destinoDeposito, comprovante, observacao, minimo: depositoMinimo });
      toast("Solicitação de depósito enviada para análise", "ok");
      setComprovante("");
      setObservacao("");
      setAba("pedidos");
    } catch (e) {
      toast((e as Error).message || "Falha ao solicitar depósito", "erro");
    } finally {
      setEnviando(false);
    }
  };

  const sacar = async () => {
    if (valorSaque < saqueMinimo) return toast(`Saque mínimo: ${fmtBRL(saqueMinimo)}`, "erro");
    if (valorSaque > data.brl) return toast("Saldo em reais insuficiente", "erro");
    setEnviando(true);
    try {
      await solicitarSaqueManual({ uid: user.uid, nome: data.nome, email: data.email, valorBRL: valorSaque, chavePix, minimo: saqueMinimo });
      toast(`${fmtBRL(valorSaque)} reservados; saque enviado para análise`, "ok");
      setChavePix("");
      setAba("pedidos");
    } catch (e) {
      toast((e as Error).message || "Falha ao solicitar saque", "erro");
    } finally {
      setEnviando(false);
    }
  };

  const pendentes = pedidos.filter((p) => p.status === "pendente").length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card glow className="overflow-hidden lg:col-span-2">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300/80">Carteira principal</p>
              <p className="mt-1 text-4xl font-black text-white sm:text-5xl">{fmtMAS(data.saldo)}</p>
              <p className="mt-1 text-sm text-slate-400">≈ {fmtBRL(data.saldo * precoMAS)} · 1 MAS = {fmtBRL(precoMAS)}</p>
            </div>
            <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-right">
              <p className="text-[10px] font-bold uppercase text-sky-400/80">Saldo disponível BRL</p>
              <p className="text-2xl font-black text-sky-300">{fmtBRL(data.brl)}</p>
            </div>
          </div>
          <div className="mt-4 h-20"><Sparkline dados={historicoPreco} cor={variacao >= 0 ? "#34d399" : "#fb7185"} /></div>
          <GraficoStatus ativo={cfg.grafico.ativo} intervaloMs={cfg.grafico.intervaloMs} proximoMs={proximoTickMs} modo={cfg.grafico.modo} />
          <div className="mt-3 flex items-center gap-2">
            <Selo tom={variacao >= 0 ? "verde" : "vermelho"}>{variacao >= 0 ? "▲" : "▼"} {fmtNum(Math.abs(variacao), 2)}% histórico</Selo>
            {pendentes > 0 && <Selo tom="ouro">⌛ {pendentes} pendente(s)</Selo>}
          </div>
        </Card>
        <Card>
          <h3 className="font-black text-white">Taxas e mínimos</h3>
          <div className="mt-3 space-y-2 text-sm">
            {[["Conversão", `${fmtNum(taxa * 100, 2)}%`], ["Depósito mínimo", fmtBRL(depositoMinimo)], ["Saque mínimo", fmtBRL(saqueMinimo)]].map(([k,v]) => (
              <div key={k} className="flex justify-between rounded-xl bg-white/5 p-2.5"><span className="text-slate-400">{k}</span><b className="text-white">{v}</b></div>
            ))}
            <p className="text-[11px] text-slate-500">Depósitos e saques são analisados manualmente pela administração.</p>
          </div>
        </Card>
      </div>

      <Abas
        abas={[
          { id: "converter" as const, nome: "Converter", emoji: "↔" },
          { id: "depositar" as const, nome: "Depositar", emoji: "+" },
          { id: "sacar" as const, nome: "Sacar", emoji: "−" },
          { id: "pedidos" as const, nome: "Solicitações", emoji: "⌛", badge: pendentes },
          { id: "extrato" as const, nome: "Extrato", emoji: "≡" },
        ]}
        ativa={aba}
        onChange={setAba}
      />

      {aba === "converter" && (
        <Card className="mx-auto max-w-2xl">
          <div className="flex rounded-xl bg-white/5 p-1">
            {(["MAS_BRL", "BRL_MAS"] as const).map((d) => (
              <button key={d} onClick={() => { setDirecao(d); setValorConversao(0); }} className={`flex-1 rounded-lg py-2.5 text-sm font-black transition ${direcao === d ? "bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white" : "text-slate-400"}`}>
                {d === "MAS_BRL" ? "MAS → BRL" : "BRL → MAS"}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            <Campo label={`Valor em ${direcao === "MAS_BRL" ? "MAS" : "Reais (R$)"}`}>
              <div className="flex gap-2">
                <Input type="number" min={0} step="0.01" value={valorConversao} onChange={(e) => setValorConversao(Math.max(0, Number(e.target.value)))} />
                <Botao variante="ghost" className="shrink-0" onClick={() => setValorConversao(saldoOrigem)}>Transferir tudo</Botao>
              </div>
            </Campo>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm">
              <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">Resumo da conversão</p>
              <div className="flex justify-between py-1 text-slate-300"><span>Valor bruto</span><b>{direcao === "MAS_BRL" ? fmtMAS(bruto) : fmtBRL(bruto)}</b></div>
              <div className="flex justify-between py-1 text-rose-300"><span>Taxa ({fmtNum(taxa * 100, 2)}%)</span><b>−{fmtBRL(taxaValor)}</b></div>
              <div className="mt-2 flex justify-between border-t border-white/10 pt-3 text-lg font-black text-emerald-300"><span>Valor líquido final</span><span>{direcao === "MAS_BRL" ? fmtBRL(liquido) : fmtMAS(liquido)}</span></div>
              <p className="mt-2 text-[10px] text-slate-500">Cotação aplicada: 1 MAS = {fmtBRL(precoMAS)}</p>
            </div>
            <Botao className="w-full py-3" disabled={bruto <= 0 || bruto > saldoOrigem} onClick={converter}>Converter {direcao === "MAS_BRL" ? "MAS em Reais" : "Reais em MAS"}</Botao>
          </div>
        </Card>
      )}

      {aba === "depositar" && (
        <Card className="mx-auto max-w-2xl">
          <h3 className="font-black text-white">Solicitar depósito manual</h3>
          <p className="mt-1 text-xs text-slate-400">Faça o PIX e envie a referência do comprovante. O saldo só será creditado após aprovação do Admin.</p>
          <div className="mt-4 space-y-3">
            <Campo label="Valor do PIX em R$" dica={`Mínimo ${fmtBRL(depositoMinimo)}`}>
              <Input type="number" min={depositoMinimo} step="0.01" value={valorDeposito} onChange={(e) => setValorDeposito(Math.max(0, Number(e.target.value)))} />
            </Campo>
            <Campo label="Receber o crédito em">
              <div className="grid grid-cols-2 gap-2">
                {(["BRL", "MAS"] as DestinoDeposito[]).map((d) => (
                  <button key={d} onClick={() => setDestinoDeposito(d)} className={`rounded-xl border py-2.5 text-sm font-black transition ${destinoDeposito === d ? "border-emerald-400 bg-emerald-500/20 text-white" : "border-white/10 bg-white/5 text-slate-400"}`}>
                    {d === "BRL" ? "R$ na Carteira" : "MAS na Carteira"}
                  </button>
                ))}
              </div>
            </Campo>
            <Campo label="Comprovante (URL ou código PIX)" dica="Cole o link da imagem ou o identificador da transação"><Input value={comprovante} onChange={(e) => setComprovante(e.target.value)} placeholder="Link ou ID do comprovante" /></Campo>
            <Campo label="Observação (opcional)"><Textarea rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} /></Campo>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-sm">
              <div className="flex justify-between text-slate-300"><span>Valor enviado</span><b>{fmtBRL(valorDeposito)}</b></div>
              <div className="mt-1 flex justify-between font-black text-emerald-300"><span>Crédito após aprovação</span><span>{destinoDeposito === "BRL" ? fmtBRL(valorDeposito) : fmtMAS(valorDeposito / precoMAS)}</span></div>
            </div>
            <Botao variante="sucesso" className="w-full py-3" disabled={enviando || valorDeposito < depositoMinimo} onClick={depositar}>{enviando ? "Enviando..." : "Enviar solicitação de depósito"}</Botao>
          </div>
        </Card>
      )}

      {aba === "sacar" && (
        <Card className="mx-auto max-w-2xl">
          <h3 className="font-black text-white">Solicitar saque via PIX</h3>
          <p className="mt-1 text-xs text-slate-400">O valor fica reservado imediatamente. Se o saque for recusado, o estorno é automático e integral.</p>
          <div className="mt-4 space-y-3">
            <Campo label="Valor do saque em R$" dica={`Disponível ${fmtBRL(data.brl)} · mínimo ${fmtBRL(saqueMinimo)}`}>
              <div className="flex gap-2"><Input type="number" min={saqueMinimo} step="0.01" value={valorSaque} onChange={(e) => setValorSaque(Math.max(0, Number(e.target.value)))} /><Botao variante="ghost" className="shrink-0" onClick={() => setValorSaque(data.brl)}>Sacar tudo</Botao></div>
            </Campo>
            <Campo label="Chave PIX"><Input value={chavePix} onChange={(e) => setChavePix(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" /></Campo>
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.06] p-3 text-sm">
              <div className="flex justify-between text-slate-300"><span>Valor bruto</span><b>{fmtBRL(valorSaque)}</b></div>
              <div className="mt-1 flex justify-between text-slate-300"><span>Taxa de saque</span><b>{fmtBRL(0)}</b></div>
              <div className="mt-2 flex justify-between border-t border-white/10 pt-2 font-black text-sky-300"><span>Valor líquido a transferir</span><span>{fmtBRL(valorSaque)}</span></div>
            </div>
            <Botao variante="ouro" className="w-full py-3" disabled={enviando || valorSaque < saqueMinimo || valorSaque > data.brl || !chavePix.trim()} onClick={sacar}>{enviando ? "Reservando..." : `Reservar e solicitar ${fmtBRL(valorSaque)}`}</Botao>
          </div>
        </Card>
      )}

      {aba === "pedidos" && (
        <Card>
          <h3 className="mb-3 font-black text-white">Solicitações manuais</h3>
          {pedidos.length === 0 ? <Vazio emoji="⌛" titulo="Nenhuma solicitação" texto="Seus depósitos e saques manuais aparecerão aqui." /> : (
            <div className="space-y-2">
              {pedidos.map((p) => {
                const st = STATUS[p.status];
                return <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-xl">{p.tipo === "deposito" ? "+" : "−"}</div>
                  <div className="min-w-0 flex-1"><p className="font-bold capitalize text-white">{p.tipo} · {fmtBRL(p.valorBRL)}</p><p className="truncate text-[11px] text-slate-400">{p.tipo === "deposito" ? `Crédito em ${p.destino}` : `PIX ${p.chavePix}`} · pedido {p.id.slice(0, 8)}</p>{p.motivoRecusa && <p className="mt-1 text-[11px] text-rose-300">Motivo: {p.motivoRecusa}</p>}</div>
                  <div className="text-right"><Selo tom={st.tom}>{st.icone} {st.label}</Selo><p className="mt-1 text-[10px] text-slate-500">{new Date(p.criadoEm).toLocaleString("pt-BR")}</p></div>
                </div>;
              })}
            </div>
          )}
        </Card>
      )}

      {aba === "extrato" && (
        <Card>
          <h3 className="mb-3 font-black text-white">Extrato completo</h3>
          {data.historico.length === 0 ? <Vazio emoji="≡" titulo="Nenhuma movimentação" /> : (
            <div className="max-h-[520px] space-y-1 overflow-y-auto">{data.historico.map((h, i) => <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-white/5"><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{h.t}</p><p className="truncate text-[11px] text-slate-500">{h.d} · {new Date(h.ts).toLocaleString("pt-BR")}</p></div><span className={`shrink-0 text-sm font-black ${h.v >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{h.v >= 0 ? "+" : "−"}{h.moeda === "BRL" ? fmtBRL(Math.abs(h.v)) : fmtMAS(Math.abs(h.v))}</span></div>)}</div>
          )}
        </Card>
      )}
    </div>
  );
}